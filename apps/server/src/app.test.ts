import { describe, expect, it } from 'vitest';
import { MockEventSource } from '@obs-widgets/kick';
import { buildApp } from './app';
import { EventBus } from './event-bus';
import type { AppConfig } from './config';

const config: AppConfig = {
  PORT: 0,
  CORS_ORIGIN: '*',
  EVENT_SOURCE: 'mock',
  ENABLE_DEBUG_ENDPOINT: true,
  KICK_CHANNEL: 'demo',
  KICK_VERIFY_SIGNATURE: false,
};

describe('server app', () => {
  it('GET /healthz responde ok con la fuente activa', async () => {
    const bus = new EventBus();
    const app = await buildApp({
      config,
      bus,
      bundle: { source: new MockEventSource({ channel: 'demo' }) },
    });

    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', source: 'mock' });

    await app.close();
  });

  it('POST /debug/emit publica un evento válido', async () => {
    const bus = new EventBus();
    const app = await buildApp({
      config,
      bus,
      bundle: { source: new MockEventSource({ channel: 'demo' }) },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/debug/emit',
      payload: { type: 'follower.new', username: 'tester' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().emitted).toMatchObject({ type: 'follower.new', channel: 'demo' });

    await app.close();
  });
});
