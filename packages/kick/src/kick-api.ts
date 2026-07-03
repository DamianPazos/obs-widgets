/**
 * Cliente de la API oficial de Kick para desarrolladores.
 *
 * Usa un **app access token** (OAuth 2.1 client_credentials) para:
 *  - obtener la clave pública de verificación de webhooks,
 *  - resolver el `broadcaster_user_id` a partir del slug del canal,
 *  - crear/listar las suscripciones de eventos (entregados por webhook).
 *
 * Docs: https://docs.kick.com
 */

const ID_BASE = 'https://id.kick.com';
const API_BASE = 'https://api.kick.com/public/v1';

export interface KickApiOptions {
  clientId: string;
  clientSecret: string;
}

export interface KickEventSubscription {
  name: string;
  version: number;
}

export interface KickSubscriptionRecord {
  id: string;
  event: string;
  version: number;
  broadcaster_user_id: number;
}

export class KickApiClient {
  private accessToken: string | null = null;
  private expiresAt = 0;

  constructor(private readonly options: KickApiOptions) {}

  /** Obtiene (y cachea) un app access token vía client_credentials. */
  private async getToken(): Promise<string> {
    if (this.accessToken && this.expiresAt > Date.now() + 30_000) {
      return this.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
    });

    const res = await fetch(`${ID_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new Error(`Kick: no se pudo obtener el app token (${res.status}): ${await res.text()}`);
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = json.access_token;
    this.expiresAt = Date.now() + json.expires_in * 1000;
    return this.accessToken;
  }

  private async authFetch(
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  ): Promise<Response> {
    const token = await this.getToken();
    return fetch(url, {
      method: init.method,
      headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` },
      body: init.body,
    });
  }

  /** Clave pública (PEM) para verificar la firma de los webhooks. Endpoint público. */
  async getPublicKey(): Promise<string> {
    const res = await fetch(`${API_BASE}/public-key`);
    if (!res.ok) {
      throw new Error(`Kick: no se pudo obtener la clave pública (${res.status})`);
    }
    const json = (await res.json()) as { data?: { public_key?: string } };
    const pem = json.data?.public_key;
    if (!pem) throw new Error('Kick: respuesta inesperada del endpoint public-key');
    return pem;
  }

  /** Resuelve el broadcaster_user_id a partir del slug del canal. */
  async getBroadcasterId(slug: string): Promise<number> {
    const res = await this.authFetch(`${API_BASE}/channels?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) {
      throw new Error(
        `Kick: no se pudo resolver el canal "${slug}" (${res.status}): ${await res.text()}`,
      );
    }
    const json = (await res.json()) as {
      data?: Array<{ broadcaster_user_id?: number; slug?: string }>;
    };
    const id = json.data?.[0]?.broadcaster_user_id;
    if (id == null) throw new Error(`Kick: canal "${slug}" no encontrado`);
    return id;
  }

  /**
   * Estado actual del stream del canal (en vivo + inicio + espectadores),
   * leído de /channels.
   */
  async getStreamStatus(
    slug: string,
  ): Promise<{ live: boolean; startedAt?: string; viewers?: number }> {
    const res = await this.authFetch(`${API_BASE}/channels?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) {
      throw new Error(`Kick: no se pudo leer el estado del canal "${slug}" (${res.status})`);
    }
    const json = (await res.json()) as {
      data?: Array<{
        stream?: { is_live?: boolean; start_time?: string; viewer_count?: number };
      }>;
    };
    const stream = json.data?.[0]?.stream;
    const viewers = typeof stream?.viewer_count === 'number' ? stream.viewer_count : undefined;
    return { live: Boolean(stream?.is_live), startedAt: stream?.start_time, viewers };
  }

  /** Lista las suscripciones de eventos existentes de la app. */
  async listSubscriptions(): Promise<KickSubscriptionRecord[]> {
    const res = await this.authFetch(`${API_BASE}/events/subscriptions`);
    if (!res.ok) {
      throw new Error(`Kick: no se pudieron listar las suscripciones (${res.status})`);
    }
    const json = (await res.json()) as { data?: KickSubscriptionRecord[] };
    return json.data ?? [];
  }

  /** Crea suscripciones de eventos (entregados por webhook) para un canal. */
  async subscribe(broadcasterUserId: number, events: KickEventSubscription[]): Promise<void> {
    const res = await this.authFetch(`${API_BASE}/events/subscriptions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        broadcaster_user_id: broadcasterUserId,
        method: 'webhook',
        events,
      }),
    });
    if (!res.ok) {
      throw new Error(`Kick: no se pudo suscribir a eventos (${res.status}): ${await res.text()}`);
    }
  }

  /**
   * Crea únicamente las suscripciones que falten para el canal indicado.
   * Devuelve las que se crearon en esta llamada.
   */
  async ensureSubscriptions(
    broadcasterUserId: number,
    events: KickEventSubscription[],
  ): Promise<KickEventSubscription[]> {
    const existing = await this.listSubscriptions().catch(() => [] as KickSubscriptionRecord[]);
    const existingNames = new Set(
      existing.filter((s) => s.broadcaster_user_id === broadcasterUserId).map((s) => s.event),
    );
    const missing = events.filter((e) => !existingNames.has(e.name));
    if (missing.length > 0) await this.subscribe(broadcasterUserId, missing);
    return missing;
  }
}
