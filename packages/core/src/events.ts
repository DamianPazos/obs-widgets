import { z } from 'zod';

/**
 * Catálogo de tipos de eventos que un widget puede consumir.
 *
 * Para agregar un evento nuevo:
 *   1. Sumá una variante al `WidgetEventSchema` (abajo).
 *   2. Mapeá la fuente correspondiente (ej. Kick) a esa variante en su adapter.
 *   3. Consumilo desde el widget filtrando por `type`.
 */
export const WIDGET_EVENT_TYPES = [
  'follower.new',
  'subscription.new',
  'chat.message',
  'stream.status',
  'stream.viewers',
] as const;

export type WidgetEventType = (typeof WIDGET_EVENT_TYPES)[number];

/** Campos comunes a todos los eventos. */
const baseFields = {
  /** Canal de origen (ej. slug del canal de Kick). */
  channel: z.string().min(1),
  /** Momento en que se generó el evento (ISO 8601). */
  timestamp: z.string().datetime(),
};

export const FollowerNewEventSchema = z.object({
  ...baseFields,
  type: z.literal('follower.new'),
  payload: z.object({
    username: z.string().min(1),
    userId: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export const SubscriptionNewEventSchema = z.object({
  ...baseFields,
  type: z.literal('subscription.new'),
  payload: z.object({
    username: z.string().min(1),
    /** Meses acumulados (para nueva/renovación). */
    months: z.number().int().nonnegative().default(1),
    tier: z.string().optional(),
    /** Qué tipo de suscripción es. */
    kind: z.enum(['new', 'renewal', 'gift']).default('new'),
    /** Cantidad de subs regaladas (solo para `gift`). */
    count: z.number().int().positive().optional(),
  }),
});

export const ChatMessageEventSchema = z.object({
  ...baseFields,
  type: z.literal('chat.message'),
  payload: z.object({
    username: z.string().min(1),
    message: z.string(),
    color: z.string().optional(),
  }),
});

export const StreamStatusEventSchema = z.object({
  ...baseFields,
  type: z.literal('stream.status'),
  payload: z.object({
    /** Si el canal está en vivo. */
    live: z.boolean(),
    /** Momento en que arrancó el stream (ISO 8601), si está en vivo. */
    startedAt: z.string().optional(),
  }),
});

export const StreamViewersEventSchema = z.object({
  ...baseFields,
  type: z.literal('stream.viewers'),
  payload: z.object({
    /** Cantidad de espectadores en vivo. */
    viewers: z.number().int().nonnegative(),
    /** Si el canal está en vivo (para ocultar cuando no lo está). */
    live: z.boolean().default(true),
  }),
});

export const WidgetEventSchema = z.discriminatedUnion('type', [
  FollowerNewEventSchema,
  SubscriptionNewEventSchema,
  ChatMessageEventSchema,
  StreamStatusEventSchema,
  StreamViewersEventSchema,
]);

export type WidgetEvent = z.infer<typeof WidgetEventSchema>;
export type FollowerNewEvent = z.infer<typeof FollowerNewEventSchema>;
export type SubscriptionNewEvent = z.infer<typeof SubscriptionNewEventSchema>;
export type ChatMessageEvent = z.infer<typeof ChatMessageEventSchema>;
export type StreamStatusEvent = z.infer<typeof StreamStatusEventSchema>;
export type StreamViewersEvent = z.infer<typeof StreamViewersEventSchema>;

/** Helper para construir un evento con timestamp por defecto. */
export function makeEvent<T extends WidgetEvent>(
  event: Omit<T, 'timestamp'> & { timestamp?: string },
): T {
  return {
    timestamp: new Date().toISOString(),
    ...event,
  } as T;
}
