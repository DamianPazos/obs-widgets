import { describe, expect, it } from 'vitest';
import { WidgetEventSchema } from '@obs-widgets/core';
import { mapKickWsEvent } from './kick-ws-source';

describe('mapKickWsEvent', () => {
  it('mapea FollowersUpdated (followed) a follower.new', () => {
    const event = mapKickWsEvent(
      'App\\Events\\FollowersUpdated',
      { username: 'juan', followed: true, followersCount: 10 },
      'demo',
    );
    expect(event).toMatchObject({
      type: 'follower.new',
      channel: 'demo',
      payload: { username: 'juan' },
    });
    expect(WidgetEventSchema.safeParse(event).success).toBe(true);
  });

  it('ignora un unfollow (followed=false)', () => {
    expect(
      mapKickWsEvent(
        'App\\Events\\FollowersUpdated',
        { username: 'juan', followed: false },
        'demo',
      ),
    ).toBeNull();
  });

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
