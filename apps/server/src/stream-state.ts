import type { StreamStatusEvent, WidgetEvent } from '@obs-widgets/core';

/**
 * Guarda el último estado de stream conocido por canal.
 *
 * Sirve para mandarle un "snapshot" a los widgets que se conectan DESPUÉS de
 * que el stream ya arrancó: los webhooks solo avisan transiciones, así que sin
 * esto un widget abierto a mitad de stream no sabría que está en vivo.
 */
export class StreamStateStore {
  private readonly byChannel = new Map<string, StreamStatusEvent>();

  /** Actualiza el estado si el evento es de tipo stream.status. */
  update(event: WidgetEvent): void {
    if (event.type === 'stream.status') {
      this.byChannel.set(event.channel, event);
    }
  }

  /** Último estado conocido para un canal, si hay. */
  get(channel: string): StreamStatusEvent | undefined {
    return this.byChannel.get(channel);
  }
}
