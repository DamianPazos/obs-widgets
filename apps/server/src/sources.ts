import type { EventSource } from '@obs-widgets/core';
import { KickEventSource, MockEventSource } from '@obs-widgets/kick';
import type { AppConfig } from './config';

export interface SourceBundle {
  source: EventSource;
  /** Presente solo cuando la fuente es Kick (para rutear los webhooks). */
  kick?: KickEventSource;
}

/**
 * Fábrica de fuentes de eventos. Elegir la plataforma es cambiar un env var:
 * el resto del sistema depende solo del puerto `EventSource`.
 */
export function createEventSource(config: AppConfig): SourceBundle {
  if (config.EVENT_SOURCE === 'kick') {
    const kick = new KickEventSource({
      channel: config.KICK_CHANNEL,
      verifySignature: config.KICK_VERIFY_SIGNATURE,
      publicKeyPem: config.KICK_WEBHOOK_PUBLIC_KEY,
      clientId: config.KICK_CLIENT_ID,
      clientSecret: config.KICK_CLIENT_SECRET,
      viewersPollMs: config.KICK_VIEWERS_POLL_MS,
      log: (message) => console.info(`[kick] ${message}`),
    });
    return { source: kick, kick };
  }

  return { source: new MockEventSource({ channel: config.KICK_CHANNEL }) };
}
