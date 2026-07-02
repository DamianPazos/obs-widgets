import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetEvent } from '@obs-widgets/core';
import { KickEventSource } from './kick-source';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Simula la API de Kick según la URL/método pedido. */
function stubKickApi(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/oauth/token'))
        return jsonResponse({ access_token: 'tok', expires_in: 3600 });
      if (url.endsWith('/public-key')) return jsonResponse({ data: { public_key: 'PEM' } });
      if (url.includes('/channels?slug='))
        return jsonResponse({ data: [{ broadcaster_user_id: 42, slug: 'demo' }] });
      if (url.endsWith('/events/subscriptions')) {
        // GET (listar) devuelve vacío; POST (suscribir) devuelve ok.
        return jsonResponse({ data: [] });
      }
      return jsonResponse({}, 404);
    }),
  );
}

describe('KickEventSource', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('en start() resuelve el canal y crea las suscripciones', async () => {
    stubKickApi();
    const source = new KickEventSource({
      channel: 'demo',
      verifySignature: false,
      clientId: 'id',
      clientSecret: 'secret',
    });

    await source.start();

    const calls = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(calls.some((u) => u.endsWith('/oauth/token'))).toBe(true);
    expect(calls.some((u) => u.includes('/channels?slug=demo'))).toBe(true);
    expect(calls.some((u) => u.endsWith('/events/subscriptions'))).toBe(true);
  });

  it('ingestWebhook emite el evento normalizado', async () => {
    stubKickApi();
    const source = new KickEventSource({
      channel: 'demo',
      verifySignature: false,
      clientId: 'id',
      clientSecret: 'secret',
    });
    await source.start();

    const received: WidgetEvent[] = [];
    source.onEvent((e) => received.push(e));

    const accepted = source.ingestWebhook(
      { messageId: '1', timestamp: 't', signature: '', eventType: 'channel.followed' },
      JSON.stringify({ broadcaster: { channel_slug: 'demo' }, follower: { username: 'lucas' } }),
    );

    expect(accepted).toBe(true);
    expect(received[0]).toMatchObject({ type: 'follower.new', payload: { username: 'lucas' } });
  });

  it('sin credenciales y con verificación de firma, start() falla con un mensaje claro', async () => {
    const source = new KickEventSource({ channel: 'demo', verifySignature: true });
    await expect(source.start()).rejects.toThrow(/clave pública/i);
  });
});
