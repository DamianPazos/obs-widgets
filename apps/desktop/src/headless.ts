import { startEventServer } from '@obs-widgets/server';

/**
 * Arranca solo el server (sin ventana). Útil para probar el bundle o correr el
 * relay como servicio. El directorio de widgets se pasa por WIDGETS_DIR.
 */
startEventServer({ staticDir: process.env.WIDGETS_DIR })
  .then((handle) => {
    console.info(`OBS Widgets (headless) escuchando en ${handle.url} (fuente: ${handle.source})`);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
