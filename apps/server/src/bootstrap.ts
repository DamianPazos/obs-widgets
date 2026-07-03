import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { loadConfig, type AppConfig } from './config';
import { EventBus } from './event-bus';
import { createEventSource } from './sources';
import { StreamStateStore } from './stream-state';

export interface StartServerOptions {
  /** Directorio del build de widgets a servir (modo escritorio). */
  staticDir?: string;
  /** Overrides de configuración (además de lo que venga por env). */
  configOverrides?: Partial<AppConfig>;
}

export interface ServerHandle {
  app: FastifyInstance;
  /** Puerto real en el que quedó escuchando. */
  port: number;
  /** URL base local, ej. `http://localhost:8787`. */
  url: string;
  /** Fuente de eventos activa (mock/kick). */
  source: string;
  stop: () => Promise<void>;
}

/**
 * Levanta el servidor de eventos completo: config → fuente → bus → estado →
 * app HTTP/WS, y arranca la fuente. Lo comparten el CLI (`index.ts`) y la app
 * de escritorio (Electron).
 */
export async function startEventServer(opts: StartServerOptions = {}): Promise<ServerHandle> {
  const config: AppConfig = { ...loadConfig(), ...opts.configOverrides };
  const bundle = createEventSource(config);
  const bus = new EventBus();
  const streamState = new StreamStateStore();

  // La fuente publica en el bus (reparte a los widgets) y actualiza el estado
  // de stream (para el snapshot que reciben los widgets al conectarse).
  bundle.source.onEvent((event) => {
    streamState.update(event);
    bus.publish(event);
  });

  // @fastify/static exige una ruta absoluta.
  const staticDir = opts.staticDir ? resolve(opts.staticDir) : undefined;
  const app = await buildApp({ config, bus, bundle, streamState, staticDir });
  await bundle.source.start();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });

  const address = app.server.address();
  const port = typeof address === 'object' && address ? address.port : config.PORT;

  return {
    app,
    port,
    url: `http://localhost:${port}`,
    source: bundle.source.name,
    stop: async () => {
      await bundle.source.stop();
      await app.close();
    },
  };
}
