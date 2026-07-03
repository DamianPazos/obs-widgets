import { createServer } from 'node:net';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { KickChannelResolver } from '@obs-widgets/kick';
import { buildApp } from './app';
import { loadConfig, type AppConfig } from './config';
import { EventBus } from './event-bus';
import { createEventSource } from './sources';
import { StreamStateStore } from './stream-state';

export type { AppConfig } from './config';

/** True si `port` está libre para escuchar en `host`. */
function portIsFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const probe = createServer();
    probe.once('error', () => resolvePromise(false));
    probe.once('listening', () => probe.close(() => resolvePromise(true)));
    probe.listen(port, host);
  });
}

/** Devuelve el `preferred` si está libre, o el próximo libre (hasta +20). */
async function pickPort(preferred: number, host: string): Promise<number> {
  for (let port = preferred; port <= preferred + 20; port++) {
    if (await portIsFree(port, host)) return port;
  }
  // Ninguno libre: devolvemos el preferido para que el listen falle con su error.
  return preferred;
}

export interface StartServerOptions {
  /** Directorio del build de widgets a servir (modo escritorio). */
  staticDir?: string;
  /** Overrides de configuración (además de lo que venga por env). */
  configOverrides?: Partial<AppConfig>;
  /**
   * Resolver de ids del canal para la fuente `kick-ws`. El desktop inyecta uno
   * basado en Chromium (saltea Cloudflare); en el server se usa el fetch directo.
   */
  kickChannelResolver?: KickChannelResolver;
}

export interface ServerHandle {
  app: FastifyInstance;
  /** Puerto real en el que quedó escuchando. */
  port: number;
  /** `true` si hubo que usar un puerto distinto al configurado. */
  portChanged: boolean;
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
  const bundle = createEventSource(config, { kickChannelInfo: opts.kickChannelResolver });
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

  // Si la fuente falla al arrancar (ej. Kick inalcanzable), NO tumbamos el
  // server: el panel y los widgets offline tienen que seguir funcionando.
  try {
    await bundle.source.start();
  } catch (err) {
    app.log.error({ err }, `La fuente "${bundle.source.name}" no pudo iniciar`);
  }

  // Si el puerto preferido está ocupado (otra instancia, server de dev, etc.),
  // tomamos el próximo libre en vez de tumbar la app.
  const host = '0.0.0.0';
  const port = await pickPort(config.PORT, host);
  await app.listen({ port, host });

  return {
    app,
    port,
    /** `true` si hubo que usar un puerto distinto al configurado. */
    portChanged: port !== config.PORT,
    url: `http://localhost:${port}`,
    source: bundle.source.name,
    stop: async () => {
      await bundle.source.stop();
      await app.close();
    },
  };
}
