import { ServerMessageSchema, type WidgetEvent, type WidgetEventType } from '@obs-widgets/core';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface EventClientOptions {
  /** URL base del servidor, ej. `ws://localhost:8787`. */
  serverUrl: string;
  channel: string;
  /** Tipos de evento a recibir; si se omite, llegan todos los del canal. */
  events?: WidgetEventType[];
  onEvent: (event: WidgetEvent) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

/**
 * Cliente WebSocket con reconexión automática. Valida cada mensaje entrante
 * contra el contrato compartido antes de entregárselo al widget.
 *
 * Devuelve una función para desconectar (usar en el cleanup de onMount).
 */
export function connectEvents(opts: EventClientOptions): () => void {
  let ws: WebSocket | null = null;
  let closedByUser = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const url = new URL(opts.serverUrl.replace(/^http/, 'ws'));
  url.pathname = '/ws';
  // Sin canal, el server usa el configurado en la app (así OBS no necesita channel=).
  if (opts.channel) url.searchParams.set('channel', opts.channel);
  if (opts.events && opts.events.length > 0) {
    url.searchParams.set('events', opts.events.join(','));
  }

  const open = (): void => {
    opts.onStatus?.('connecting');
    ws = new WebSocket(url.toString());

    ws.onopen = () => {
      retry = 0;
      opts.onStatus?.('open');
    };

    ws.onmessage = (ev) => {
      try {
        const message = ServerMessageSchema.parse(JSON.parse(ev.data as string));
        if (message.kind === 'event') opts.onEvent(message.event);
      } catch {
        /* mensaje malformado: se ignora */
      }
    };

    ws.onclose = () => {
      opts.onStatus?.('closed');
      if (closedByUser) return;
      retry += 1;
      reconnectTimer = setTimeout(open, Math.min(1000 * retry, 10_000));
    };

    ws.onerror = () => ws?.close();
  };

  open();

  return () => {
    closedByUser = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
