import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/headless.ts', 'src/settings-preload.ts'],
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Electron lo provee el runtime; @ngrok/ngrok es un módulo nativo (.node) que no
  // se puede bundlear (se empaqueta aparte). El resto (server, fastify, etc.) se
  // inlinea en el bundle para que la app sea autocontenida.
  external: ['electron', '@ngrok/ngrok'],
  noExternal: [/@obs-widgets\//],
});
