import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopSettings } from './settings';

/** Estado agregado que la app expone al panel (server + túnel + config). */
export interface DesktopStatus {
  settings: DesktopSettings;
  serverUrl: string;
  portChanged: boolean;
  tunnel: {
    /** Si el modo/config piden túnel (oficial + authtoken). */
    wanted: boolean;
    url: string | null;
    error: string | null;
    /** URL exacta a registrar en el portal de Kick, o `null`. */
    webhookUrl: string | null;
  };
  server: {
    source: string;
    channel: string;
    live: boolean;
    viewers: number | null;
    subscribers: number;
    lastEvent: { type: string; at: string } | null;
  } | null;
}

export interface WebhookTestResult {
  reachable: boolean;
  status?: number;
  error?: string;
}

/**
 * Puente seguro entre el panel (renderer, aislado) y el proceso principal.
 * Expone lo justo: leer/guardar config, estado agregado y un test del webhook.
 * En el navegador (OBS, browser puro) `window.obs` no existe → el panel degrada.
 */
contextBridge.exposeInMainWorld('obs', {
  isDesktop: true,
  getSettings: (): Promise<DesktopSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (next: DesktopSettings): Promise<{ url: string }> =>
    ipcRenderer.invoke('settings:save', next),
  getStatus: (): Promise<DesktopStatus> => ipcRenderer.invoke('status:get'),
  testWebhook: (): Promise<WebhookTestResult> => ipcRenderer.invoke('webhook:test'),
});
