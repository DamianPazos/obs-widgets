import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { AppConfig } from '@obs-widgets/server';

/** Fuente de eventos elegible desde la app. */
export type EventSourceMode = 'mock' | 'kick-ws' | 'kick';

/** Configuración de la app de escritorio (persistida en userData). */
export interface DesktopSettings {
  /** Modo de eventos: mock / WS saliente / webhooks oficiales. */
  eventSource: EventSourceMode;
  /** Slug del canal de Kick a escuchar. */
  channel: string;
  /** Puerto local del server (el que apuntás en OBS). */
  port: number;
  /** Abrir la app al iniciar sesión en el SO. */
  autostart: boolean;
}

export const DEFAULT_SETTINGS: DesktopSettings = {
  eventSource: 'mock',
  channel: 'demo',
  port: 8787,
  autostart: false,
};

/** Convierte los settings de la app en overrides de config del server. */
export function toConfigOverrides(s: DesktopSettings): Partial<AppConfig> {
  return {
    EVENT_SOURCE: s.eventSource,
    KICK_CHANNEL: s.channel,
    PORT: s.port,
  };
}

/** Settings persistidos en un archivo JSON (uno por usuario). */
export class SettingsStore {
  private settings: DesktopSettings;

  constructor(private readonly file: string) {
    this.settings = this.load();
  }

  private load(): DesktopSettings {
    try {
      if (existsSync(this.file)) {
        const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<DesktopSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      /* archivo corrupto: usamos defaults */
    }
    return { ...DEFAULT_SETTINGS };
  }

  get(): DesktopSettings {
    return { ...this.settings };
  }

  /** Guarda validando/saneando los campos. Devuelve los settings resultantes. */
  save(next: Partial<DesktopSettings>): DesktopSettings {
    const merged: DesktopSettings = { ...this.settings, ...next };
    this.settings = {
      eventSource: ['mock', 'kick-ws', 'kick'].includes(merged.eventSource)
        ? merged.eventSource
        : 'mock',
      channel: merged.channel?.trim() || 'demo',
      port: Number.isFinite(merged.port) && merged.port > 0 ? Math.floor(merged.port) : 8787,
      autostart: Boolean(merged.autostart),
    };
    writeFileSync(this.file, JSON.stringify(this.settings, null, 2));
    return this.get();
  }
}
