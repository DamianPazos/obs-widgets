import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeEvent, WIDGET_EVENT_TYPES, type WidgetEvent } from '@obs-widgets/core';
import type { EventBus } from '../event-bus';
import type { AppConfig } from '../config';

const EmitBodySchema = z.object({
  type: z.enum(WIDGET_EVENT_TYPES).default('follower.new'),
  channel: z.string().optional(),
  username: z.string().default('probador'),
  message: z.string().optional(),
  live: z.boolean().optional(),
  viewers: z.number().int().nonnegative().optional(),
  kind: z.enum(['new', 'renewal', 'gift']).optional(),
  months: z.number().int().positive().optional(),
  count: z.number().int().positive().optional(),
});

/**
 * Endpoint para disparar eventos de prueba y previsualizar alertas en OBS.
 * Ej: curl -X POST localhost:8787/debug/emit -H "content-type: application/json" \
 *          -d '{"type":"follower.new","username":"test"}'
 */
export function registerDebugRoute(app: FastifyInstance, bus: EventBus, config: AppConfig): void {
  app.post('/debug/emit', async (req, reply) => {
    const parsed = EmitBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { type, channel, username, message, live, viewers, kind, months, count } = parsed.data;
    const target = channel ?? config.KICK_CHANNEL;

    let event: WidgetEvent;
    switch (type) {
      case 'subscription.new':
        event = makeEvent({
          type,
          channel: target,
          payload: {
            username,
            kind: kind ?? 'new',
            months: months ?? 1,
            ...(kind === 'gift' ? { count: count ?? 1 } : {}),
          },
        });
        break;
      case 'chat.message':
        event = makeEvent({
          type,
          channel: target,
          payload: { username, message: message ?? '¡Hola!' },
        });
        break;
      case 'stream.status':
        event = makeEvent({
          type,
          channel: target,
          payload: { live: live ?? true, startedAt: new Date().toISOString() },
        });
        break;
      case 'stream.viewers':
        event = makeEvent({
          type,
          channel: target,
          payload: { viewers: viewers ?? 100, live: live ?? true },
        });
        break;
      default:
        event = makeEvent({ type: 'follower.new', channel: target, payload: { username } });
    }

    bus.publish(event);
    return reply.send({ emitted: event });
  });
}
