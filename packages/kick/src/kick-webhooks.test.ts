import { createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mapKickWebhookToEvent, verifyKickSignature } from './kick-webhooks';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

function sign(messageId: string, timestamp: string, body: string): string {
  const signer = createSign('sha256');
  signer.update(`${messageId}.${timestamp}.${body}`);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

describe('verifyKickSignature', () => {
  const messageId = '01HZZZ';
  const timestamp = '2026-01-01T00:00:00Z';

  it('acepta una firma válida', () => {
    const body = JSON.stringify({ hello: 'world' });
    const signatureBase64 = sign(messageId, timestamp, body);
    expect(
      verifyKickSignature({ publicKeyPem, messageId, timestamp, rawBody: body, signatureBase64 }),
    ).toBe(true);
  });

  it('rechaza si el body fue alterado', () => {
    const signatureBase64 = sign(messageId, timestamp, JSON.stringify({ hello: 'world' }));
    expect(
      verifyKickSignature({
        publicKeyPem,
        messageId,
        timestamp,
        rawBody: JSON.stringify({ hello: 'tampered' }),
        signatureBase64,
      }),
    ).toBe(false);
  });
});

describe('mapKickWebhookToEvent', () => {
  it('mapea channel.followed a follower.new', () => {
    const event = mapKickWebhookToEvent(
      'channel.followed',
      { broadcaster: { channel_slug: 'demo' }, follower: { username: 'juan', user_id: 5 } },
      'fallback',
    );
    expect(event).toMatchObject({
      type: 'follower.new',
      channel: 'demo',
      payload: { username: 'juan', userId: '5' },
    });
  });

  it('mapea channel.subscription.new como kind "new"', () => {
    const event = mapKickWebhookToEvent(
      'channel.subscription.new',
      { broadcaster: { channel_slug: 'demo' }, subscriber: { username: 'leo' }, duration: 3 },
      'fallback',
    );
    expect(event).toMatchObject({
      type: 'subscription.new',
      channel: 'demo',
      payload: { username: 'leo', months: 3, kind: 'new' },
    });
  });

  it('mapea channel.subscription.renewal como kind "renewal"', () => {
    const event = mapKickWebhookToEvent(
      'channel.subscription.renewal',
      { broadcaster: { channel_slug: 'demo' }, subscriber: { username: 'leo' }, duration: 5 },
      'fallback',
    );
    expect(event).toMatchObject({
      type: 'subscription.new',
      payload: { username: 'leo', months: 5, kind: 'renewal' },
    });
  });

  it('mapea channel.subscription.gifts usando el gifter y la cantidad de giftees', () => {
    const event = mapKickWebhookToEvent(
      'channel.subscription.gifts',
      { broadcaster: { channel_slug: 'demo' }, gifter: { username: 'ana' }, giftees: [{}, {}, {}] },
      'fallback',
    );
    expect(event).toMatchObject({
      type: 'subscription.new',
      channel: 'demo',
      payload: { username: 'ana', kind: 'gift', count: 3 },
    });
  });

  it('usa el canal de fallback si el broadcaster no trae slug', () => {
    const event = mapKickWebhookToEvent(
      'channel.followed',
      { follower: { username: 'x' } },
      'mi-canal',
    );
    expect(event?.channel).toBe('mi-canal');
  });

  it('mapea livestream.status.updated a stream.status', () => {
    const event = mapKickWebhookToEvent(
      'livestream.status.updated',
      { broadcaster: { channel_slug: 'demo' }, is_live: true, started_at: '2026-01-01T10:00:00Z' },
      'fallback',
    );
    expect(event).toMatchObject({
      type: 'stream.status',
      channel: 'demo',
      payload: { live: true, startedAt: '2026-01-01T10:00:00Z' },
    });
  });

  it('devuelve null para eventos no soportados', () => {
    expect(mapKickWebhookToEvent('moderation.banned', {}, 'demo')).toBeNull();
  });
});
