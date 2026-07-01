import { BaseEventSource } from '@obs-widgets/core';
import {
  mapKickWebhookToEvent,
  verifyKickSignature,
  type KickWebhookHeaders,
} from './kick-webhooks';

export interface KickSourceOptions {
  /** Slug del canal a monitorear (fallback si el payload no lo trae). */
  channel: string;
  /** Si es `true`, se rechazan webhooks sin firma válida. */
  verifySignature: boolean;
  /** Clave pública PEM de Kick para verificar firmas (requerida si verifySignature). */
  publicKeyPem?: string;
}

/**
 * Fuente de eventos conectada a Kick vía webhooks.
 *
 * A diferencia de una conexión saliente, Kick nos "empuja" los eventos por HTTP.
 * Por eso `start()` no abre nada: es el servidor el que, al recibir un webhook,
 * llama a `ingestWebhook()`. Esta clase se encarga de verificar la firma,
 * normalizar el payload y emitir el evento de dominio.
 */
export class KickEventSource extends BaseEventSource {
  readonly name = 'kick';

  constructor(private readonly options: KickSourceOptions) {
    super();
  }

  async start(): Promise<void> {
    if (this.options.verifySignature && !this.options.publicKeyPem) {
      throw new Error(
        'KickEventSource: falta la clave pública para verificar firmas. ' +
          'Configurá KICK_WEBHOOK_PUBLIC_KEY o poné KICK_VERIFY_SIGNATURE=false para pruebas locales.',
      );
    }
  }

  async stop(): Promise<void> {
    /* nada que liberar: los webhooks son entrantes */
  }

  /**
   * Procesa un webhook entrante. Devuelve `true` si se aceptó (firma válida y
   * evento mapeado) o `false` si se descartó.
   */
  ingestWebhook(headers: KickWebhookHeaders, rawBody: string): boolean {
    if (this.options.verifySignature) {
      const valid = verifyKickSignature({
        publicKeyPem: this.options.publicKeyPem!,
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
