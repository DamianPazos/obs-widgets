import { startEventServer } from './bootstrap';

async function main(): Promise<void> {
  const handle = await startEventServer();
  handle.app.log.info(
    `Widgets escuchando eventos de la fuente: "${handle.source}" en ${handle.url}`,
  );

  const shutdown = async (): Promise<void> => {
    handle.app.log.info('Cerrando...');
    await handle.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
