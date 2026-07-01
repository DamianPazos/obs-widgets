import type { WidgetEvent } from './events';

/** Callback que recibe un evento de dominio. */
export type EventHandler = (event: WidgetEvent) => void;

/** Función para cancelar una suscripción. */
export type Unsubscribe = () => void;

/**
 * Puerto (hexagonal) que abstrae CUALQUIER fuente de eventos en tiempo real.
 *
 * Los adapters concretos (Kick, mock, YouTube, Twitch, ...) implementan esta
 * interfaz. El servidor solo depende de este puerto, nunca de un proveedor
 * concreto: así agregar una plataforma nueva no toca el core ni los widgets.
 */
export interface EventSource {
  /** Nombre legible del adapter, útil para logs y el mensaje `welcome`. */
  readonly name: string;

  /** Inicializa la fuente (conexiones, timers, validación de config, etc.). */
  start(): Promise<void>;

  /** Libera recursos. */
  stop(): Promise<void>;

  /** Registra un handler para los eventos entrantes. Devuelve un unsubscribe. */
  onEvent(handler: EventHandler): Unsubscribe;
}

/**
 * Base reutilizable para implementar `EventSource`: administra la lista de
 * handlers y ofrece `emit()` a las subclases.
 */
export abstract class BaseEventSource implements EventSource {
  abstract readonly name: string;
  private readonly handlers = new Set<EventHandler>();

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  onEvent(handler: EventHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  protected emit(event: WidgetEvent): void {
    for (const handler of this.handlers) handler(event);
  }
}
