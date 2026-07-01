import { WebSocket } from 'ws';
import type { ServerMessage, WidgetEvent, WidgetEventType } from '@obs-widgets/core';

export interface Subscriber {
  socket: WebSocket;
  channel: string;
  /** Si se define, solo recibe estos tipos de evento. */
  events?: Set<WidgetEventType>;
}

/**
 * Hub en memoria que reparte eventos a los widgets conectados por WebSocket,
 * filtrando por canal y (opcionalmente) por tipo de evento.
 */
export class EventBus {
  private readonly subscribers = new Set<Subscriber>();

  /** Registra un suscriptor y devuelve una función para quitarlo. */
  add(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  get size(): number {
    return this.subscribers.size;
  }

  /** Reparte un evento a todos los suscriptores que correspondan. */
  publish(event: WidgetEvent): void {
    for (const sub of this.subscribers) {
      if (sub.channel !== event.channel) continue;
      if (sub.events && !sub.events.has(event.type)) continue;
      this.send(sub.socket, { kind: 'event', event });
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}
