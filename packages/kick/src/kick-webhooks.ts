import { createVerify } from 'node:crypto';
import { makeEvent, type WidgetEvent } from '@obs-widgets/core';
import type { KickEventSubscription } from './kick-api';

/**
 * Procesamiento de los webhooks de la API oficial de Kick: verificación de
 * firma y normalización de payloads a eventos de dominio (`WidgetEvent`).
 *
 * Nombres/versiones de eventos según https://docs.kick.com/events/event-types
 */

/** Eventos a los que nos suscribimos por defecto (todos versión 1). */
export const DEFAULT_KICK_EVENTS: KickEventSubscription[] = [
  { name: 'channel.followed', version: 1 },
  { name: 'channel.subscription.new', version: 1 },
  { name: 'channel.subscription.renewal', version: 1 },
  { name: 'channel.subscription.gifts', version: 1 },
];

/** Headers que envía Kick en cada webhook. */
export interface KickWebhookHeaders {
  /** `Kick-Event-Message-Id` (ULID). */
  messageId: string;
  /** `Kick-Event-Message-Timestamp` (RFC3339). */
  timestamp: string;
  /** `Kick-Event-Signature` (base64). */
  signature: string;
  /** `Kick-Event-Type` (ej. channel.followed). */
  eventType: string;
  /** `Kick-Event-Version` (ej. 1). */
  version?: string;
}

/**
 * Verifica la firma de un webhook de Kick.
 *
 * Kick firma la cadena `${messageId}.${timestamp}.${rawBody}` con su clave
 * privada RSA (RSA-SHA256, PKCS#1 v1.5). Se valida con la clave pública PEM
 * obtenida de `GET https://api.kick.com/public/v1/public-key`.
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
  user_id?: number | string;
  channel_slug?: string;
  slug?: string;
  username?: string;
}

interface KickUserRef {
  user_id?: number | string;
  username?: string;
  profile_picture?: string;
  is_anonymous?: boolean;
}

interface KickWebhookPayload {
  broadcaster?: KickBroadcaster;
  follower?: KickUserRef;
  subscriber?: KickUserRef;
  gifter?: KickUserRef;
  giftees?: unknown[];
  sender?: KickUserRef;
  duration?: number;
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

function asId(value: number | string | undefined): string | undefined {
  return value != null ? String(value) : undefined;
}

/**
 * Normaliza un webhook de Kick a un `WidgetEvent`, o `null` si el tipo de
 * evento no nos interesa.
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
          userId: asId(payload.follower?.user_id),
          avatarUrl: payload.follower?.profile_picture,
        },
      });

    case 'channel.subscription.new':
    case 'channel.subscription.renewal':
      return makeEvent<WidgetEvent>({
        type: 'subscription.new',
        channel,
        payload: {
          username: payload.subscriber?.username ?? 'anónimo',
          months: typeof payload.duration === 'number' ? payload.duration : 1,
        },
      });

    case 'channel.subscription.gifts':
      return makeEvent<WidgetEvent>({
        type: 'subscription.new',
        channel,
        payload: {
          username: payload.gifter?.username ?? 'anónimo',
          months: Array.isArray(payload.giftees) ? payload.giftees.length : 1,
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
