import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import type { AppConfig } from './config';
import type { EventBus } from './event-bus';
import type { SourceBundle } from './sources';
import type { StreamStateStore } from './stream-state';
import { registerWsRoute } from './routes/ws';
import { registerWebhookRoute } from './routes/webhooks';
import { registerDebugRoute } from './routes/debug';
import { registerAuthRoutes } from './routes/auth';

export interface BuildAppDeps {
  config: AppConfig;
  bus: EventBus;
  bundle: SourceBundle;
  streamState: StreamStateStore;
}

export async function buildApp({
  config,
  bus,
  bundle,
  streamState,
}: BuildAppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
  });
  await app.register(websocket);

  // Guardamos el body crudo para poder verificar la firma de los webhooks de Kick.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as unknown as { rawBody?: string }).rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.get('/healthz', async () => ({
    status: 'ok',
    source: bundle.source.name,
    subscribers: bus.size,
  }));

  registerWsRoute(app, bus, bundle.source.name, streamState);

  if (bundle.kick) {
    registerWebhookRoute(app, bundle.kick);
    registerAuthRoutes(app, config);
  }

  if (config.ENABLE_DEBUG_ENDPOINT) {
    registerDebugRoute(app, bus, config);
  }

  return app;
}
