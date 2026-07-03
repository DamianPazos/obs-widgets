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

// Nombre estable → misma carpeta de userData (settings) en dev y empaquetado.
app.setName('OBS Widgets');

let tray: Tray | null = null;
let win: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let server: ServerHandle | null = null;
let settings: SettingsStore | null = null;
let baseUrl = '';
let quitting = false;

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

function staticPath(file: string): string {
  return join(__dirname, '..', 'static', file);
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
    webPreferences: { contextIsolation: true, nodeIntegration: false },
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

function openSettings(): void {
  if (settingsWin) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 540,
    height: 680,
    title: 'Configuración · OBS Widgets',
    backgroundColor: '#0d0f14',
    autoHideMenuBar: true,
    icon: assetPath('icon.png'),
    webPreferences: {
      preload: join(__dirname, 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.on('closed', () => (settingsWin = null));
  void settingsWin.loadFile(staticPath('settings.html'));
}

function buildTray(): void {
  const icon = nativeImage.createFromPath(assetPath('icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('OBS Widgets');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir panel', click: () => createWindow() },
      { label: 'Configuración…', click: () => openSettings() },
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

/** Reinicia el server con la config actual (tras cambiar settings). */
async function restartServer(): Promise<void> {
  await server?.stop();
  server = await startEventServer(serverOpts());
  const changed = server.url !== baseUrl;
  baseUrl = server.url;
  if (win) {
    if (changed) void win.loadURL(baseUrl);
    else win.reload();
  }
}

function applyAutostart(enabled: boolean): void {
  if (!app.isPackaged) return; // en dev no tiene sentido tocar el arranque del SO
  app.setLoginItemSettings({ openAtLogin: enabled });
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => settings!.get());
  ipcMain.handle('settings:save', async (_event, next: DesktopSettings) => {
    const saved = settings!.save(next);
    applyAutostart(saved.autostart);
    await restartServer();
    return { url: baseUrl };
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
  server = await startEventServer(serverOpts());
  baseUrl = server.url;
  console.info(`OBS Widgets escuchando en ${baseUrl} (fuente: ${server.source})`);

  applyAutostart(settings.get().autostart);
  registerIpc();
  buildTray();
  createWindow();
  setupAutoUpdate();
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
  void server?.stop();
});
