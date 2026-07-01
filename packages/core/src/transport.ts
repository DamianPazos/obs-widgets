import { z } from 'zod';
import { WidgetEventSchema, WIDGET_EVENT_TYPES } from './events';

/**
 * Contrato de mensajería entre el servidor relay y los widgets (WebSocket).
 * Ambos lados validan con estos esquemas: el widget nunca recibe algo que no
 * cumpla el contrato, y el servidor rechaza suscripciones mal formadas.
 */

/** Mensaje que el widget (cliente) envía al servidor para suscribirse. */
export const ClientMessageSchema = z.object({
  action: z.literal('subscribe'),
  /** Canal del que se quieren recibir eventos. */
  channel: z.string().min(1),
  /** Lista opcional de tipos de eventos; si se omite, se reciben todos. */
  events: z.array(z.enum(WIDGET_EVENT_TYPES)).optional(),
});

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/** Mensajes que el servidor envía al widget. */
export const ServerMessageSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('welcome'),
    source: z.string(),
    channel: z.string(),
  }),
  z.object({
    kind: z.literal('event'),
    event: WidgetEventSchema,
  }),
  z.object({
    kind: z.literal('error'),
    message: z.string(),
  }),
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
