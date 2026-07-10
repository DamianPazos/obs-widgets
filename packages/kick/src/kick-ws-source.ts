import WebSocket from 'ws';
import {
  BaseEventSource,
  makeEvent,
  type FollowerNewEvent,
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
  /** Cantidad actual de seguidores (para detectar follows por diferencia). */
  followersCount?: number;
}

/** Resuelve los ids/estado de un canal a partir de su slug. */
export type KickChannelResolver = (slug: string) => Promise<KickChannelInfo>;

interface RawChannel {
  id?: number;
  chatroom?: { id?: number };
  followers_count?: number;
  livestream?: {
    is_live?: boolean;
    viewer_count?: number;
    created_at?: string;
    start_time?: string;
  };
}

/** Normaliza la respuesta cruda del endpoint de canales a `KickChannelInfo`. */
export function parseChannelInfo(json: unknown, slug: string): KickChannelInfo {
  const c = (json ?? {}) as RawChannel;
  if (c.id == null || c.chatroom?.id == null) {
    throw new Error(`Kick WS: respuesta inesperada para el canal "${slug}"`);
  }
  return {
    channelId: c.id,
    chatroomId: c.chatroom.id,
    live: Boolean(c.livestream?.is_live),
    viewers: c.livestream?.viewer_count,
    startedAt: c.livestream?.created_at ?? c.livestream?.start_time,
    followersCount: typeof c.followers_count === 'number' ? c.followers_count : undefined,
  };
}

/**
 * Resuelve ids y estado del canal desde el endpoint público (no oficial) de Kick.
 * El endpoint está detrás de Cloudflare y puede devolver 403 a un fetch directo;
 * reintentamos un par de veces. Para máxima fiabilidad, el desktop inyecta un
 * resolver basado en Chromium (ver KickWsSourceOptions.resolveChannelInfo).
 */
export async function fetchKickChannelInfo(slug: string): Promise<KickChannelInfo> {
  const url = `${CHANNELS_ENDPOINT}/${encodeURIComponent(slug)}`;
  const headers = {
    'user-agent': BROWSER_UA,
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9,es;q=0.8',
    referer: `https://kick.com/${encodeURIComponent(slug)}`,
  };

  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
    const res = await fetch(url, { headers });
    if (res.ok) return parseChannelInfo(await res.json(), slug);
    lastStatus = res.status;
  }
  throw new Error(`Kick WS: no se pudo resolver el canal "${slug}" (${lastStatus})`);
}

interface FollowersUpdatedPayload {
  username?: string;
  followed?: boolean;
  followersCount?: number;
  followers_count?: number;
  follower?: { username?: string };
  user?: { username?: string };
}

/**
 * Procesa un `FollowersUpdated` del WS público de Kick (vía instantánea, si Kick
 * lo emite).
 *
 * Ese evento es limitado: **no trae el nombre** de quien siguió (a veces solo el
 * contador) y se dispara tanto en follow como en unfollow. Por eso:
 *  - Distinguimos follow (el contador sube) de unfollow (baja) comparando con el
 *    conteo previo (`prevCount`), sembrado al arrancar con `followers_count`.
 *  - Si el evento no trae contador, asumimos follow (salvo `followed:false`).
 *  - Si no hay nombre, emitimos el evento **sin `username`** (el widget muestra un
 *    mensaje genérico). Para nombres reales, usar el modo oficial (webhooks).
 *
 * Devuelve el evento a emitir (o `null`) y el nuevo conteo para actualizar el estado.
 */
export function mapFollowersUpdated(
  data: unknown,
  channel: string,
  prevCount: number | null,
): { event: FollowerNewEvent | null; count: number | null } {
  const p = (data ?? {}) as FollowersUpdatedPayload;
  const raw = p.followersCount ?? p.followers_count;
  const count = typeof raw === 'number' ? raw : prevCount;

  // Unfollow explícito: nunca dispara.
  if (p.followed === false) return { event: null, count };
  // Si el evento trae contador y no subió respecto al previo, fue unfollow/sin cambio.
  if (typeof raw === 'number' && prevCount != null && raw <= prevCount) {
    return { event: null, count };
  }

  const name = p.username ?? p.follower?.username ?? p.user?.username;
  const payload = name && name.trim() ? { username: name } : {};

  return {
    event: makeEvent<FollowerNewEvent>({ type: 'follower.new', channel, payload }),
    count,
  };
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
    // `FollowersUpdated` se maneja aparte en la clase (necesita estado: el conteo
    // previo para distinguir follow de unfollow). Ver `mapFollowersUpdated`.

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
  /**
   * Cada cuánto consultar el endpoint del canal (ms). 0 desactiva. Por defecto 15s.
   * Además de espectadores, este poll detecta follows nuevos por diferencia de
   * `followers_count` (Kick no emite los follows por el WS público).
   */
  viewersPollMs?: number;
  /** URL del WebSocket (para tests). */
  wsUrl?: string;
  /**
   * Resolver de ids/estado del canal. Por defecto usa `fetchKickChannelInfo`
   * (fetch directo); el desktop inyecta uno basado en Chromium para saltear
   * Cloudflare de forma fiable.
   */
  resolveChannelInfo?: KickChannelResolver;
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
  /** Último conteo de seguidores conocido, para detectar follows por diferencia. */
  private lastFollowers: number | null = null;

  constructor(private readonly options: KickWsSourceOptions) {
    super();
  }

  private get log(): (m: string) => void {
    return this.options.log ?? (() => {});
  }

  private get resolve(): KickChannelResolver {
    return this.options.resolveChannelInfo ?? fetchKickChannelInfo;
  }

  async start(): Promise<void> {
    this.info = await this.resolve(this.options.channel);
    // Semilla del conteo de seguidores: baseline para detectar el primer follow.
    this.lastFollowers = this.info.followersCount ?? null;
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
    this.startPolling();
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

    // `FollowersUpdated` necesita estado (conteo previo): se maneja aparte.
    const name = event.split('\\').pop() ?? event;
    if (name === 'FollowersUpdated') {
      const { event: ev, count } = mapFollowersUpdated(
        data,
        this.options.channel,
        this.lastFollowers,
      );
      this.lastFollowers = count;
      if (ev) this.emit(ev);
      return;
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

  private startPolling(): void {
    const intervalMs = this.options.viewersPollMs ?? 15_000;
    if (intervalMs <= 0) return;
    this.viewersTimer = setInterval(() => {
      void this.resolve(this.options.channel)
        .then((info) => {
          this.info = info;
          this.emitViewers(info.live, info.viewers);
          this.detectFollowsByCount(info.followersCount);
        })
        .catch(() => {
          /* fallo transitorio: reintenta en el próximo tick. */
        });
    }, intervalMs);
  }

  /**
   * Detecta follows nuevos comparando el conteo actual con el último conocido.
   * Es la vía **fiable** en kick-ws: Kick no transmite los follows por el WS
   * público, pero el `followers_count` del endpoint sube. No sabemos el nombre,
   * así que usamos uno genérico (para nombres reales, usar el modo oficial).
   */
  private detectFollowsByCount(count?: number): void {
    if (typeof count !== 'number') return;
    const prev = this.lastFollowers;
    this.lastFollowers = count;
    if (prev == null || count <= prev) return;
    // Cap para no inundar si el conteo saltó mucho entre polls.
    const nuevos = Math.min(count - prev, 3);
    for (let i = 0; i < nuevos; i++) {
      // Sin nombre disponible por esta vía: el widget muestra un mensaje genérico.
      this.emit(
        makeEvent<FollowerNewEvent>({
          type: 'follower.new',
          channel: this.options.channel,
          payload: {},
        }),
      );
    }
  }
}
