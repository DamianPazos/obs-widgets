import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopSettings } from './settings';

/**
 * Puente seguro entre la ventana de settings (renderer, aislado) y el proceso
 * principal. Solo expone lo justo: leer y guardar la configuración.
 */
contextBridge.exposeInMainWorld('obs', {
  getSettings: (): Promise<DesktopSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (next: DesktopSettings): Promise<{ url: string }> =>
    ipcRenderer.invoke('settings:save', next),
});
