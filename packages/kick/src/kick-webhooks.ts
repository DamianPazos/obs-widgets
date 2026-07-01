import { createVerify } from 'node:crypto';
import { makeEvent, type WidgetEvent } from '@obs-widgets/core';

/**
 * Utilidades para procesar los webhooks de la API oficial de Kick.
 *
 * NOTA: la API de Kick para desarrolladores está en evolución. Los nombres de
 * eventos y la forma exacta del payload pueden cambiar; este mapeo está pensado
 * para ser fácil de ajustar en un solo lugar.
 * Docs: https://docs.kick.com/
 */

/** Headers relevantes que envía Kick en cada webhook. */
export interface KickWebhookHeaders {
  messageId: string;
  timestamp: string;
  signature: string;
  eventType: string;
}

/**
 * Verifica la firma de un webhook de Kick.
 *
 * Kick firma la cadena `${messageId}.${timestamp}.${rawBody}` con su clave
 * privada RSA; se valida con la clave pública (obtenible desde su endpoint
 * público de claves). Devolvé `true` solo si la firma es válida.
 */
export function verifyKickSignature(params: {
  publicKeyPem: string;
  messageId: string;
  timestamp: string;
  rawBody: string;
  signatureBase64: string;
}): boolean {
  const { publicKeyPem, messageId, timestamp, rawBody, signatureBase64 } = params;
  try {
    const verifier = createVerify('sha256');
    verifier.update(`${messageId}.${timestamp}.${rawBody}`);
    verifier.end();
    return verifier.verify(publicKeyPem, signatureBase64, 'base64');
  } catch {
    return false;
  }
}

interface KickBroadcaster {
  broadcaster_user_id?: number | string;
  channel_slug?: string;
  slug?: string;
  username?: string;
}

interface KickWebhookPayload {
  broadcaster?: KickBroadcaster;
  follower?: { username?: string; user_id?: number | string; profile_picture?: string };
  subscriber?: { username?: string };
  duration?: number;
  sender?: { username?: string };
  content?: string;
  [key: string]: unknown;
}

function resolveChannel(payload: KickWebhookPayload, fallback: string): string {
  return (
    payload.broadcaster?.channel_slug ??
    payload.broadcaster?.slug ??
    payload.broadcaster?.username ??
    fallback
  );
}

/**
 * Normaliza un webhook de Kick a un `WidgetEvent` del dominio, o `null` si el
 * tipo de evento no nos interesa.
 */
export function mapKickWebhookToEvent(
  eventType: string,
  payload: KickWebhookPayload,
  fallbackChannel: string,
): WidgetEvent | null {
  const channel = resolveChannel(payload, fallbackChannel);

  switch (eventType) {
    case 'channel.followed':
      return makeEvent<WidgetEvent>({
        type: 'follower.new',
        channel,
        payload: {
          username: payload.follower?.username ?? 'anónimo',
          userId: payload.follower?.user_id != null ? String(payload.follower.user_id) : undefined,
          avatarUrl: payload.follower?.profile_picture,
        },
      });

    case 'channel.subscription.new':
    case 'channel.subscription.renewal':
    case 'channel.subscription.gifts':
      return makeEvent<WidgetEvent>({
        type: 'subscription.new',
        channel,
        payload: {
          username: payload.subscriber?.username ?? payload.sender?.username ?? 'anónimo',
          months: typeof payload.duration === 'number' ? payload.duration : 1,
        },
      });

    case 'chat.message.sent':
      return makeEvent<WidgetEvent>({
        type: 'chat.message',
        channel,
        payload: {
          username: payload.sender?.username ?? 'anónimo',
          message: payload.content ?? '',
        },
      });

    default:
      return null;
  }
}
