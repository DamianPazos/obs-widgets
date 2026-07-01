import { buildApp } from './app';
import { loadConfig } from './config';
import { EventBus } from './event-bus';
import { createEventSource } from './sources';

async function main(): Promise<void> {
  const config = loadConfig();
  const bundle = createEventSource(config);
  const bus = new EventBus();

  // Toda la fuente publica en el bus; el bus reparte a los widgets conectados.
  bundle.source.onEvent((event) => bus.publish(event));

  const app = await buildApp({ config, bus, bundle });
  await bundle.source.start();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  app.log.info(`Widgets escuchando eventos de la fuente: "${bundle.source.name}"`);

  const shutdown = async (): Promise<void> => {
    app.log.info('Cerrando...');
    await bundle.source.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
