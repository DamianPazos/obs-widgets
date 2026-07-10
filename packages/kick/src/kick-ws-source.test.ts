import { describe, expect, it } from 'vitest';
import { WidgetEventSchema } from '@obs-widgets/core';
import { ANON_FOLLOWER, mapFollowersUpdated, mapKickWsEvent } from './kick-ws-source';

describe('mapFollowersUpdated', () => {
  it('dispara follower.new cuando el conteo sube', () => {
    const { event, count } = mapFollowersUpdated({ followers_count: 11 }, 'demo', 10);
    expect(event).toMatchObject({ type: 'follower.new', channel: 'demo' });
    expect(count).toBe(11);
    expect(WidgetEventSchema.safeParse(event).success).toBe(true);
  });

  it('usa el nombre si viene y un genérico si no', () => {
    expect(
      mapFollowersUpdated({ username: 'juan', followers_count: 11 }, 'demo', 10).event,
    ).toMatchObject({ payload: { username: 'juan' } });
    // Sin nombre: texto genérico (el schema exige username no vacío).
    const anon = mapFollowersUpdated({ followers_count: 11 }, 'demo', 10).event;
    expect(anon?.payload.username).toBe(ANON_FOLLOWER);
    expect(WidgetEventSchema.safeParse(anon).success).toBe(true);
  });

  it('ignora un unfollow (el conteo baja)', () => {
    const { event, count } = mapFollowersUpdated({ followers_count: 9 }, 'demo', 10);
    expect(event).toBeNull();
    expect(count).toBe(9);
  });

  it('ignora un unfollow explícito (followed=false)', () => {
    expect(mapFollowersUpdated({ username: 'juan', followed: false }, 'demo', 10).event).toBeNull();
  });

  it('dispara sin baseline (primer evento) o sin contador en el payload', () => {
    // Sin conteo previo conocido.
    expect(mapFollowersUpdated({ followers_count: 5 }, 'demo', null).event).not.toBeNull();
    // El evento no trae contador: asumimos follow.
    expect(mapFollowersUpdated({ username: 'ale' }, 'demo', 10).event).toMatchObject({
      payload: { username: 'ale' },
    });
  });
});

describe('mapKickWsEvent', () => {
  it('mapea SubscriptionEvent nueva vs renovación según los meses', () => {
    const nueva = mapKickWsEvent(
      'App\\Events\\SubscriptionEvent',
      { username: 'ana', months: 1 },
      'demo',
    );
    expect(nueva).toMatchObject({ type: 'subscription.new', payload: { kind: 'new', months: 1 } });

    const renovacion = mapKickWsEvent(
      'App\\Events\\SubscriptionEvent',
      { username: 'ana', months: 6 },
      'demo',
    );
    expect(renovacion).toMatchObject({
      type: 'subscription.new',
      payload: { kind: 'renewal', months: 6 },
    });
  });

  it('mapea GiftedSubscriptionsEvent al gifter y la cantidad', () => {
    const event = mapKickWsEvent(
      'App\\Events\\GiftedSubscriptionsEvent',
      { gifter_username: 'leo', gifted_usernames: ['a', 'b', 'c'] },
      'demo',
    );
    expect(event).toMatchObject({
      type: 'subscription.new',
      payload: { username: 'leo', kind: 'gift', count: 3 },
    });
  });

  it('mapea ChatMessageEvent a chat.message', () => {
    const event = mapKickWsEvent(
      'App\\Events\\ChatMessageEvent',
      { content: 'hola!', sender: { username: 'caro' } },
      'demo',
    );
    expect(event).toMatchObject({
      type: 'chat.message',
      payload: { username: 'caro', message: 'hola!' },
    });
  });

  it('mapea StreamerIsLive y StopStreamBroadcast a stream.status', () => {
    const live = mapKickWsEvent(
      'App\\Events\\StreamerIsLive',
      { livestream: { created_at: '2026-01-01T10:00:00Z' } },
      'demo',
    );
    expect(live).toMatchObject({ type: 'stream.status', payload: { live: true } });

    const off = mapKickWsEvent('App\\Events\\StopStreamBroadcast', {}, 'demo');
    expect(off).toMatchObject({ type: 'stream.status', payload: { live: false } });
  });

  it('devuelve null para eventos que no nos interesan', () => {
    expect(mapKickWsEvent('App\\Events\\GiftsLeaderboardUpdated', {}, 'demo')).toBeNull();
    expect(mapKickWsEvent('pusher:pong', {}, 'demo')).toBeNull();
  });
});
