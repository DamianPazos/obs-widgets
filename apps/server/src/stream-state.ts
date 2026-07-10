import type { StreamStatusEvent, StreamViewersEvent, WidgetEvent } from '@obs-widgets/core';

/**
 * Guarda el último estado de stream conocido por canal.
 *
 * Sirve para mandarle un "snapshot" a los widgets que se conectan DESPUÉS de
 * que el stream ya arrancó: los webhooks (y el polling de espectadores) solo
 * avisan cambios, así que sin esto un widget abierto a mitad de stream no
 * sabría que está en vivo ni cuántos espectadores hay.
 */
export class StreamStateStore {
  private readonly status = new Map<string, StreamStatusEvent>();
  private readonly viewers = new Map<string, StreamViewersEvent>();
  /** Último evento visto (de cualquier tipo), para el panel de estado. */
  private lastEvent: { type: WidgetEvent['type']; at: string } | null = null;

  /** Actualiza el estado si el evento es "sticky" (status / viewers). */
  update(event: WidgetEvent): void {
    this.lastEvent = { type: event.type, at: new Date().toISOString() };
    if (event.type === 'stream.status') {
      this.status.set(event.channel, event);
    } else if (event.type === 'stream.viewers') {
      this.viewers.set(event.channel, event);
    }
  }

  /** Último evento recibido (cualquier tipo), o `null` si todavía no llegó ninguno. */
  getLastEvent(): { type: WidgetEvent['type']; at: string } | null {
    return this.lastEvent;
  }

  /** Último estado (en vivo/offline) conocido para un canal, si hay. */
  get(channel: string): StreamStatusEvent | undefined {
    return this.status.get(channel);
  }

  /** Última cantidad de espectadores conocida para un canal, si hay. */
  getViewers(channel: string): StreamViewersEvent | undefined {
    return this.viewers.get(channel);
  }
}
