import { join } from 'node:path';
import { app, BrowserWindow, clipboard, Menu, nativeImage, shell, Tray } from 'electron';
import { startEventServer, type ServerHandle } from '@obs-widgets/server';

let tray: Tray | null = null;
let win: BrowserWindow | null = null;
let server: ServerHandle | null = null;
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

  // Cerrar la ventana la esconde a la bandeja (el server sigue vivo).
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  win.on('closed', () => (win = null));

  // Los enlaces "abrir en pestaña nueva" van al navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  void win.loadURL(baseUrl);
}

function buildTray(): void {
  const icon = nativeImage.createFromPath(assetPath('icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('OBS Widgets');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir panel', click: () => createWindow() },
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

async function startApp(): Promise<void> {
  server = await startEventServer({ staticDir: widgetsDir() });
  baseUrl = server.url;
  console.info(`OBS Widgets escuchando en ${baseUrl} (fuente: ${server.source})`);
  buildTray();
  createWindow();
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
