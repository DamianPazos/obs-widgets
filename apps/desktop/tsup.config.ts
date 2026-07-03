import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/headless.ts', 'src/settings-preload.ts'],
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Electron lo provee el runtime; el resto (server, fastify, etc.) se inlinea
  // en el bundle para que la app sea autocontenida al empaquetar.
  external: ['electron'],
  noExternal: [/@obs-widgets\//],
});
