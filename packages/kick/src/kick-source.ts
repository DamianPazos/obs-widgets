import {
  BaseEventSource,
  makeEvent,
  type StreamStatusEvent,
  type StreamViewersEvent,
} from '@obs-widgets/core';
import { KickApiClient, type KickEventSubscription } from './kick-api';
import {
  DEFAULT_KICK_EVENTS,
  mapKickWebhookToEvent,
  verifyKickSignature,
  type KickWebhookHeaders,
} from './kick-webhooks';

export interface KickSourceOptions {
  /** Slug del canal a monitorear. */
  channel: string;
  /** Si es `true`, se rechazan webhooks sin firma válida. */
  verifySignature: boolean;
  /** Clave pública PEM de Kick (si no se pasa y hay credenciales, se obtiene sola). */
  publicKeyPem?: string;
  /** Credenciales de la app de Kick (habilitan la auto-suscripción). */
  clientId?: string;
  clientSecret?: string;
  /** Eventos a los que suscribirse. Por defecto follows + subs. */
  events?: KickEventSubscription[];
  /**
   * Cada cuánto consultar la cantidad de espectadores (ms). Los webhooks no
   * mandan viewer count, así que se hace polling de /channels. Por defecto 30s.
   * `0` desactiva el polling.
   */
  viewersPollMs?: number;
  /** Logger opcional. */
  log?: (message: string) => void;
}

/**
 * Fuente de eventos conectada a Kick por webhooks.
 *
 * En `start()`, si hay credenciales:
 *  1. obtiene un app token,
 *  2. resuelve el `broadcaster_user_id` del canal,
 *  3. asegura las suscripciones de eventos (método webhook),
 *  4. obtiene la clave pública para verificar firmas.
 *
 * Los eventos llegan como webhooks entrantes: el servidor llama a
 * `ingestWebhook()`, que verifica la firma, normaliza y emite el evento.
 */
export class KickEventSource extends BaseEventSource {
  readonly name = 'kick';
  private api: KickApiClient | null = null;
  private publicKeyPem?: string;
  private viewersTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: KickSourceOptions) {
    super();
    this.publicKeyPem = options.publicKeyPem;
  }

  async start(): Promise<void> {
    const log = this.options.log ?? (() => {});
    const hasCredentials = Boolean(this.options.clientId && this.options.clientSecret);

    if (hasCredentials) {
      this.api = new KickApiClient({
        clientId: this.options.clientId!,
        clientSecret: this.options.clientSecret!,
      });

      if (this.options.verifySignature && !this.publicKeyPem) {
        this.publicKeyPem = await this.api.getPublicKey();
        log('Kick: clave pública obtenida para verificar firmas.');
      }

      const broadcasterId = await this.api.getBroadcasterId(this.options.channel);
      const events = this.options.events ?? DEFAULT_KICK_EVENTS;
      const created = await this.api.ensureSubscriptions(broadcasterId, events);
      const createdNames = created.map((e) => e.name).join(', ');
      log(
        `Kick: canal "${this.options.channel}" (id ${broadcasterId}). ` +
          `Suscripciones nuevas: ${createdNames || 'ninguna (ya existían)'}.`,
      );

      // Estado inicial del stream (para que el widget de uptime lo sepa aunque
      // se conecte con el stream ya empezado).
      const status = await this.api.getStreamStatus(this.options.channel).catch(() => null);
      if (status) {
        this.emit(
          makeEvent<StreamStatusEvent>({
            type: 'stream.status',
            channel: this.options.channel,
            payload: { live: status.live, startedAt: status.startedAt },
          }),
        );
        this.emitViewers(status.live, status.viewers);
        log(`Kick: estado inicial del stream → ${status.live ? 'EN VIVO' : 'offline'}.`);
      }

      this.startViewersPolling(log);
      return;
    }

    // Modo manual: sin credenciales solo recibimos webhooks ya configurados a mano.
    if (this.options.verifySignature && !this.publicKeyPem) {
      throw new Error(
        'KickEventSource: sin credenciales no puedo obtener la clave pública. ' +
          'Configurá KICK_CLIENT_ID/KICK_CLIENT_SECRET, o KICK_WEBHOOK_PUBLIC_KEY, ' +
          'o poné KICK_VERIFY_SIGNATURE=false para pruebas locales.',
      );
    }
    log(
      'Kick: modo manual (sin credenciales). Configurá webhook y suscripciones en el panel de Kick.',
    );
  }

  async stop(): Promise<void> {
    if (this.viewersTimer) {
      clearInterval(this.viewersTimer);
      this.viewersTimer = null;
    }
  }

  /** Emite un evento de espectadores (0 si el canal no está en vivo). */
  private emitViewers(live: boolean, viewers?: number): void {
    this.emit(
      makeEvent<StreamViewersEvent>({
        type: 'stream.viewers',
        channel: this.options.channel,
        payload: { viewers: live ? (viewers ?? 0) : 0, live },
      }),
    );
  }

  /** Consulta periódicamente la cantidad de espectadores vía /channels. */
  private startViewersPolling(log: (message: string) => void): void {
    const intervalMs = this.options.viewersPollMs ?? 30_000;
    if (intervalMs <= 0) return;

    const poll = async (): Promise<void> => {
      if (!this.api) return;
      try {
        const status = await this.api.getStreamStatus(this.options.channel);
        this.emitViewers(status.live, status.viewers);
      } catch {
        /* fallo transitorio de red/API: reintenta en el próximo tick. */
      }
    };

    this.viewersTimer = setInterval(() => void poll(), intervalMs);
    log(`Kick: polling de espectadores cada ${Math.round(intervalMs / 1000)}s.`);
  }

  /**
   * Procesa un webhook entrante. Devuelve `true` si se aceptó (firma válida y
   * evento mapeado) o `false` si se descartó.
   */
  ingestWebhook(headers: KickWebhookHeaders, rawBody: string): boolean {
    if (this.options.verifySignature) {
      if (!this.publicKeyPem) return false;
      const valid = verifyKickSignature({
        publicKeyPem: this.publicKeyPem,
        messageId: headers.messageId,
        timestamp: headers.timestamp,
        rawBody,
        signatureBase64: headers.signature,
      });
      if (!valid) return false;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return false;
    }

    const event = mapKickWebhookToEvent(
      headers.eventType,
      payload as Record<string, unknown>,
      this.options.channel,
    );
    if (!event) return false;

    this.emit(event);
    return true;
  }
}
