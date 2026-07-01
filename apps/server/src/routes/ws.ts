import type { FastifyInstance } from 'fastify';
import { ClientMessageSchema, type ServerMessage, type WidgetEventType } from '@obs-widgets/core';
import type { EventBus } from '../event-bus';

interface WsQuery {
  channel?: string;
  events?: string;
}

/**
 * Endpoint WebSocket al que se conectan los widgets.
 *
 * Un widget puede suscribirse de dos maneras:
 *  - Por query string al conectarse: `/ws?channel=demo&events=follower.new`
 *  - Enviando un mensaje `{ action: "subscribe", channel, events? }`
 */
export function registerWsRoute(app: FastifyInstance, bus: EventBus, sourceName: string): void {
  app.get<{ Querystring: WsQuery }>('/ws', { websocket: true }, (socket, req) => {
    let remove: (() => void) | null = null;

    const subscribe = (channel: string, events?: WidgetEventType[]) => {
      remove?.();
      remove = bus.add({
        socket,
        channel,
        events: events && events.length > 0 ? new Set(events) : undefined,
      });
      const welcome: ServerMessage = { kind: 'welcome', source: sourceName, channel };
      socket.send(JSON.stringify(welcome));
    };

    // Suscripción inmediata vía query string (lo más cómodo para OBS).
    const { channel, events } = req.query;
    if (channel) {
      const list = events
        ?.split(',')
        .map((e) => e.trim())
        .filter(Boolean) as WidgetEventType[] | undefined;
      subscribe(channel, list);
    }

    socket.on('message', (raw: Buffer) => {
      let data: unknown;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        const err: ServerMessage = { kind: 'error', message: 'JSON inválido' };
        socket.send(JSON.stringify(err));
        return;
      }

      const parsed = ClientMessageSchema.safeParse(data);
      if (!parsed.success) {
        const err: ServerMessage = { kind: 'error', message: 'Mensaje de suscripción inválido' };
        socket.send(JSON.stringify(err));
        return;
      }

      subscribe(parsed.data.channel, parsed.data.events);
    });

    socket.on('close', () => remove?.());
  });
}
