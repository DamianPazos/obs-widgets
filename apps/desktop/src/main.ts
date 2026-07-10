import { join } from 'node:path';
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  net,
  shell,
  Tray,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { startEventServer, type ServerHandle } from '@obs-widgets/server';
import { parseChannelInfo, type KickChannelInfo } from '@obs-widgets/kick';
import { SettingsStore, toConfigOverrides, type DesktopSettings } from './settings';
import { startTunnel, stopTunnel, tunnelUrl } from './tunnel';
import type { DesktopStatus, WebhookTestResult } from './settings-preload';

// Nombre estable → misma carpeta de userData (settings) en dev y empaquetado.
app.setName('OBS Widgets');

let tray: Tray | null = null;
let win: BrowserWindow | null = null;
let server: ServerHandle | null = null;
let settings: SettingsStore | null = null;
let baseUrl = '';
let quitting = false;
/** Último error del túnel (para mostrarlo en el panel de Conexión). */
let tunnelError: string | null = null;

/** Directorio del build de widgets (servido por el server embebido). */
function widgetsDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'widgets')
    : join(__dirname, '..', '..', 'widgets', 'dist');
}

function assetPath(file: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'assets', file)
    : join(__dirname, '..', 'assets', file);
}

/**
 * Resuelve los ids del canal de Kick usando la red de Chromium (`net.fetch`),
 * que presenta un fingerprint de navegador real y pasa el Cloudflare del
 * endpoint público (donde un fetch de Node suele recibir 403).
 */
async function resolveKickChannel(slug: string): Promise<KickChannelInfo> {
  const res = await net.fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Kick WS (desktop): no se pudo resolver "${slug}" (${res.status})`);
  }
  return parseChannelInfo(await res.json(), slug);
}

function serverOpts(): Parameters<typeof startEventServer>[0] {
  return {
    staticDir: widgetsDir(),
    configOverrides: toConfigOverrides(settings!.get()),
    kickChannelResolver: resolveKickChannel,
  };
}

function createWindow(): void {
  if (win) {
    win.show();
    win.focus();
    return;
  }

  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'OBS Widgets',
    backgroundColor: '#0d0f14',
    autoHideMenuBar: true,
    icon: assetPath('icon.png'),
    webPreferences: {
      // El preload expone `window.obs` al panel servido (config, estado, túnel).
      preload: join(__dirname, 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  win.on('closed', () => (win = null));
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  void win.loadURL(baseUrl);
}

/** Abre el panel principal en una sección concreta (ej. `connect`). */
function openPanel(route?: string): void {
  createWindow();
  const target = route ? `${baseUrl}/?${route}` : baseUrl;
  if (win && win.webContents.getURL() !== target) void win.loadURL(target);
}

function buildTray(): void {
  const icon = nativeImage.createFromPath(assetPath('icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('OBS Widgets');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir panel', click: () => openPanel() },
      { label: 'Conexión y configuración…', click: () => openPanel('connect') },
      {
        label: 'Copiar URL base (para OBS)',
        click: () => clipboard.writeText(baseUrl),
      },
      { label: 'Abrir en el navegador', click: () => void shell.openExternal(baseUrl) },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('double-click', () => createWindow());
}

/**
 * Levanta o baja el túnel según la config actual. Solo el modo oficial (`kick`)
 * con authtoken de ngrok usa túnel; `mock`/`kick-ws` nunca. No lanza: si falla,
 * guarda el error para mostrarlo en el panel de Conexión (la app sigue viva).
 */
async function manageTunnel(): Promise<void> {
  const s = settings!.get();
  const wantsTunnel = s.eventSource === 'kick' && Boolean(s.ngrokAuthtoken);
  tunnelError = null;

  if (!wantsTunnel || !server) {
    await stopTunnel();
    return;
  }

  try {
    const url = await startTunnel({
      port: server.port,
      authtoken: s.ngrokAuthtoken,
      domain: s.ngrokDomain || undefined,
    });
    console.info(`Túnel ngrok activo: ${url} → ${baseUrl}`);
  } catch (err) {
    tunnelError = err instanceof Error ? err.message : String(err);
    console.error('No se pudo levantar el túnel ngrok:', tunnelError);
  }
}

/** Reinicia el server con la config actual (tras cambiar settings). */
async function restartServer(): Promise<void> {
  await stopTunnel();
  await server?.stop();
  server = await startEventServer(serverOpts());
  const changed = server.url !== baseUrl;
  baseUrl = server.url;
  await manageTunnel();
  if (win) {
    if (changed) void win.loadURL(baseUrl);
    else win.reload();
  }
}

function applyAutostart(enabled: boolean): void {
  if (!app.isPackaged) return; // en dev no tiene sentido tocar el arranque del SO
  app.setLoginItemSettings({ openAtLogin: enabled });
}

/** Estado agregado (config + server + túnel) para el panel de Conexión. */
async function buildStatus(): Promise<DesktopStatus> {
  const s = settings!.get();
  const wantsTunnel = s.eventSource === 'kick' && Boolean(s.ngrokAuthtoken);
  const url = tunnelUrl();

  let serverStatus: DesktopStatus['server'] = null;
  try {
    const res = await net.fetch(`${baseUrl}/api/status`);
    if (res.ok) serverStatus = (await res.json()) as DesktopStatus['server'];
  } catch {
    /* el server puede estar reiniciando: dejamos server=null */
  }

  return {
    settings: s,
    serverUrl: baseUrl,
    portChanged: server?.portChanged ?? false,
    tunnel: {
      wanted: wantsTunnel,
      url,
      error: tunnelError,
      webhookUrl: url ? `${url}/webhooks/kick` : null,
    },
    server: serverStatus,
  };
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => settings!.get());
  ipcMain.handle('settings:save', async (_event, next: DesktopSettings) => {
    const saved = settings!.save(next);
    applyAutostart(saved.autostart);
    await restartServer();
    return { url: baseUrl };
  });
  ipcMain.handle('status:get', () => buildStatus());
  ipcMain.handle('webhook:test', async (): Promise<WebhookTestResult> => {
    const url = tunnelUrl();
    if (!url) return { reachable: false, error: 'El túnel no está activo.' };
    try {
      // POST al webhook por la URL pública: si vuelve, Kick también puede llegar.
      const res = await net.fetch(`${url}/webhooks/kick`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      // 200 (aceptado) o 202 (descartado por firma/tipo): la URL es alcanzable.
      return { reachable: res.status === 200 || res.status === 202, status: res.status };
    } catch (err) {
      return { reachable: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}

function setupAutoUpdate(): void {
  if (!app.isPackaged) return; // solo tiene sentido en la app instalada
  autoUpdater.on('update-downloaded', (info) => {
    const choice = dialog.showMessageBoxSync({
      type: 'info',
      buttons: ['Reiniciar ahora', 'Después'],
      defaultId: 0,
      cancelId: 1,
      title: 'Actualización disponible',
      message: `Se descargó la versión ${info.version}.`,
      detail: '¿Reiniciar la app para aplicarla?',
    });
    if (choice === 0) {
      quitting = true;
      autoUpdater.quitAndInstall();
    }
  });
  autoUpdater.on('error', (err) => console.error('auto-update error:', err));
  void autoUpdater.checkForUpdatesAndNotify();
}

async function startApp(): Promise<void> {
  settings = new SettingsStore(join(app.getPath('userData'), 'settings.json'));
  const port = settings.get().port;

  try {
    server = await startEventServer(serverOpts());
  } catch (err) {
    // Nunca cerramos en silencio: le decimos al usuario qué pasó.
    dialog.showErrorBox(
      'No se pudo iniciar OBS Widgets',
      `No se pudo levantar el servidor local en el puerto ${port}.\n\n` +
        `${err instanceof Error ? err.message : String(err)}\n\n` +
        `Cerrá otras instancias (o el server de desarrollo) y volvé a abrir, ` +
        `o cambiá el puerto en Configuración.`,
    );
    app.quit();
    return;
  }

  baseUrl = server.url;
  console.info(`OBS Widgets escuchando en ${baseUrl} (fuente: ${server.source})`);

  await manageTunnel();
  applyAutostart(settings.get().autostart);
  registerIpc();
  buildTray();
  createWindow();
  setupAutoUpdate();

  // Si el puerto configurado estaba ocupado, avisamos qué URL quedó activa.
  if (server.portChanged) {
    void dialog.showMessageBox({
      type: 'info',
      title: 'Puerto en uso',
      message: `El puerto ${port} estaba ocupado.`,
      detail: `La app está usando ${baseUrl}. Apuntá tus Browser Source de OBS a esa URL (o liberá el puerto ${port} y reiniciá).`,
    });
  }
}

// Una sola instancia: si ya hay una corriendo, mostramos su ventana y salimos.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => createWindow());
  app
    .whenReady()
    .then(startApp)
    .catch((err: unknown) => {
      console.error('No se pudo iniciar OBS Widgets:', err);
      app.quit();
    });
}

// No salimos al cerrar todas las ventanas: quedamos vivos en la bandeja.
app.on('window-all-closed', () => {
  /* intencionalmente vacío: el server sigue corriendo en la bandeja. */
});

app.on('activate', () => createWindow());

app.on('before-quit', () => {
  quitting = true;
  void stopTunnel();
  void server?.stop();
});
