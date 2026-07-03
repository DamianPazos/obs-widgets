import WebSocket from 'ws';
import {
  BaseEventSource,
  makeEvent,
  type StreamStatusEvent,
  type StreamViewersEvent,
  type WidgetEvent,
} from '@obs-widgets/core';

/**
 * Fuente de eventos de Kick por **conexión saliente** (sin webhooks ni túnel).
 *
 * Se conecta al WebSocket público de Kick (Pusher) y escucha los eventos del
 * canal y del chat. No necesita credenciales: alcanza con el slug del canal.
 * Los ids del canal/chatroom se resuelven con el endpoint público de Kick.
 *
 * ⚠️ Es la vía **no oficial** (la que usan los overlays de terceros): puede
 * cambiar si Kick modifica su front. La vía soportada son los webhooks
 * (ver KickEventSource).
 */

/** WebSocket de Pusher que usa Kick (app key pública). */
const DEFAULT_WS_URL =
  'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false';

const CHANNELS_ENDPOINT = 'https://kick.com/api/v2/channels';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface KickChannelInfo {
  channelId: number;
  chatroomId: number;
  live: boolean;
  viewers?: number;
  startedAt?: string;
}

/** Resuelve ids y estado del canal desde el endpoint público (no oficial) de Kick. */
export async function fetchKickChannelInfo(slug: string): Promise<KickChannelInfo> {
  const res = await fetch(`${CHANNELS_ENDPOINT}/${encodeURIComponent(slug)}`, {
    headers: { 'user-agent': BROWSER_UA, accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Kick WS: no se pudo resolver el canal "${slug}" (${res.status})`);
  }
  const json = (await res.json()) as {
    id?: number;
    chatroom?: { id?: number };
    livestream?: {
      is_live?: boolean;
      viewer_count?: number;
      created_at?: string;
      start_time?: string;
    };
  };
  if (json.id == null || json.chatroom?.id == null) {
    throw new Error(`Kick WS: respuesta inesperada para el canal "${slug}"`);
  }
  return {
    channelId: json.id,
    chatroomId: json.chatroom.id,
    live: Boolean(json.livestream?.is_live),
    viewers: json.livestream?.viewer_count,
    startedAt: json.livestream?.created_at ?? json.livestream?.start_time,
  };
}

interface FollowersUpdatedPayload {
  username?: string;
  followed?: boolean;
}
interface SubscriptionPayload {
  username?: string;
  months?: number;
}
interface GiftedSubscriptionsPayload {
  gifter_username?: string;
  gifted_usernames?: unknown[];
}
interface ChatMessagePayload {
  content?: string;
  sender?: { username?: string };
}
interface StreamStatePayload {
  livestream?: { created_at?: string };
}

/**
 * Normaliza un evento de Pusher de Kick a un `WidgetEvent`, o `null` si no nos
 * interesa. `data` ya viene parseado (Pusher lo entrega como string JSON).
 */
export function mapKickWsEvent(
  eventName: string,
  data: unknown,
  channel: string,
): WidgetEvent | null {
  // Los nombres llegan como "App\\Events\\FollowersUpdated": tomamos el último segmento.
  const name = eventName.split('\\').pop() ?? eventName;
  const payload = (data ?? {}) as Record<string, unknown>;

  switch (name) {
    case 'FollowersUpdated': {
      const p = payload as FollowersUpdatedPayload;
      // followed=false es un unfollow: lo ignoramos.
      if (p.followed === false || !p.username) return null;
      return makeEvent<WidgetEvent>({
        type: 'follower.new',
        channel,
        payload: { username: p.username },
      });
    }

    case 'SubscriptionEvent': {
      const p = payload as SubscriptionPayload;
      if (!p.username) return null;
      const months = typeof p.months === 'number' ? p.months : 1;
      return makeEvent<WidgetEvent>({
        type: 'subscription.new',
        channel,
        payload: { username: p.username, months, kind: months > 1 ? 'renewal' : 'new' },
      });
    }

    case 'GiftedSubscriptionsEvent': {
      const p = payload as GiftedSubscriptionsPayload;
      const count = Array.isArray(p.gifted_usernames) ? p.gifted_usernames.length : 1;
      return makeEvent<WidgetEvent>({
        type: 'subscription.new',
        channel,
        payload: { username: p.gifter_username ?? 'anónimo', kind: 'gift', count },
      });
    }

    case 'ChatMessageEvent': {
      const p = payload as ChatMessagePayload;
      return makeEvent<WidgetEvent>({
        type: 'chat.message',
        channel,
        payload: { username: p.sender?.username ?? 'anónimo', message: p.content ?? '' },
      });
    }

    case 'StreamerIsLive': {
      const p = payload as StreamStatePayload;
      return makeEvent<WidgetEvent>({
        type: 'stream.status',
        channel,
        payload: { live: true, startedAt: p.livestream?.created_at },
      });
    }

    case 'StopStreamBroadcast':
      return makeEvent<WidgetEvent>({
        type: 'stream.status',
        channel,
        payload: { live: false },
      });

    default:
      return null;
  }
}

export interface KickWsSourceOptions {
  /** Slug del canal a escuchar. */
  channel: string;
  /** Cada cuánto consultar espectadores (ms). 0 desactiva. Por defecto 30s. */
  viewersPollMs?: number;
  /** URL del WebSocket (para tests). */
  wsUrl?: string;
  log?: (message: string) => void;
}

export class KickWsSource extends BaseEventSource {
  readonly name = 'kick-ws';
  private ws: WebSocket | null = null;
  private info: KickChannelInfo | null = null;
  private viewersTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retry = 0;
  private closedByUser = false;

  constructor(private readonly options: KickWsSourceOptions) {
    super();
  }

  private get log(): (m: string) => void {
    return this.options.log ?? (() => {});
  }

  async start(): Promise<void> {
    this.info = await fetchKickChannelInfo(this.options.channel);
    this.log(
      `Kick WS: canal "${this.options.channel}" (channel ${this.info.channelId}, ` +
        `chatroom ${this.info.chatroomId}). Estado: ${this.info.live ? 'EN VIVO' : 'offline'}.`,
    );

    // Estado inicial (para el snapshot que reciben los widgets al conectarse).
    this.emit(
      makeEvent<StreamStatusEvent>({
        type: 'stream.status',
        channel: this.options.channel,
        payload: { live: this.info.live, startedAt: this.info.startedAt },
      }),
    );
    this.emitViewers(this.info.live, this.info.viewers);

    this.connect();
    this.startViewersPolling();
  }

  async stop(): Promise<void> {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.viewersTimer) clearInterval(this.viewersTimer);
    this.reconnectTimer = null;
    this.viewersTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  private connect(): void {
    const ws = new WebSocket(this.options.wsUrl ?? DEFAULT_WS_URL);
    this.ws = ws;

    ws.on('message', (raw: WebSocket.RawData) => this.onMessage(raw.toString()));
    ws.on('error', () => ws.close());
    ws.on('close', () => {
      if (this.closedByUser) return;
      this.retry += 1;
      const delay = Math.min(1000 * this.retry, 15_000);
      this.log(`Kick WS: conexión caída, reintentando en ${Math.round(delay / 1000)}s.`);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    });
  }

  private send(event: string, data: Record<string, unknown> = {}): void {
    this.ws?.send(JSON.stringify({ event, data }));
  }

  private onMessage(raw: string): void {
    let msg: { event?: string; data?: unknown };
    try {
      msg = JSON.parse(raw) as { event?: string; data?: unknown };
    } catch {
      return;
    }
    const event = msg.event;
    if (!event) return;

    if (event === 'pusher:connection_established') {
      this.retry = 0;
      if (this.info) {
        this.send('pusher:subscribe', { channel: `channel.${this.info.channelId}` });
        this.send('pusher:subscribe', { channel: `chatrooms.${this.info.chatroomId}.v2` });
        this.log('Kick WS: conectado y suscripto a los eventos del canal.');
      }
      return;
    }
    if (event === 'pusher:ping') {
      this.send('pusher:pong');
      return;
    }
    if (event.startsWith('pusher:') || event.startsWith('pusher_internal:')) return;

    // El payload viene como string JSON dentro de `data`.
    let data: unknown = msg.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        /* algunos eventos traen data no-JSON: se ignora */
      }
    }

    const mapped = mapKickWsEvent(event, data, this.options.channel);
    if (mapped) this.emit(mapped);
  }

  private emitViewers(live: boolean, viewers?: number): void {
    this.emit(
      makeEvent<StreamViewersEvent>({
        type: 'stream.viewers',
        channel: this.options.channel,
        payload: { viewers: live ? (viewers ?? 0) : 0, live },
      }),
    );
  }

  private startViewersPolling(): void {
    const intervalMs = this.options.viewersPollMs ?? 30_000;
    if (intervalMs <= 0) return;
    this.viewersTimer = setInterval(() => {
      void fetchKickChannelInfo(this.options.channel)
        .then((info) => {
          this.info = info;
          this.emitViewers(info.live, info.viewers);
        })
        .catch(() => {
          /* fallo transitorio: reintenta en el próximo tick. */
        });
    }, intervalMs);
  }
}
