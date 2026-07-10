/**
 * Puente hacia la app de escritorio (Electron). El preload expone `window.obs`
 * solo cuando el panel corre dentro de la app; en el navegador / OBS no existe,
 * así que el panel de Conexión degrada con un aviso.
 */

export type EventSourceMode = 'mock' | 'kick-ws' | 'kick';

export interface DesktopSettings {
  eventSource: EventSourceMode;
  channel: string;
  port: number;
  autostart: boolean;
  clientId: string;
  clientSecret: string;
  ngrokAuthtoken: string;
  ngrokDomain: string;
}

export interface DesktopStatus {
  settings: DesktopSettings;
  serverUrl: string;
  portChanged: boolean;
  tunnel: {
    wanted: boolean;
    url: string | null;
    error: string | null;
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

export interface ObsBridge {
  isDesktop: true;
  getSettings(): Promise<DesktopSettings>;
  saveSettings(next: DesktopSettings): Promise<{ url: string }>;
  getStatus(): Promise<DesktopStatus>;
  testWebhook(): Promise<WebhookTestResult>;
}

/** Devuelve el puente si estamos dentro de la app de escritorio, o `null`. */
export function obs(): ObsBridge | null {
  return (window as unknown as { obs?: ObsBridge }).obs ?? null;
}
