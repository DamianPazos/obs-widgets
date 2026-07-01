import type { WidgetManifest } from '../../lib/manifest';

export const manifest: WidgetManifest = {
  id: 'live-streaming',
  name: 'Live Streaming',
  description:
    'Banner "EN VIVO" con reloj y textos configurables. Funciona 100% offline, sin conexión a Kick.',
  mode: 'offline',
  params: [
    { name: 'title', description: 'Texto principal del banner', example: 'EN VIVO' },
    { name: 'subtitle', description: 'Texto secundario', example: 'Bienvenidos al stream' },
    { name: 'accent', description: 'Color de acento (hex sin #)', example: '53fc18' },
  ],
  load: () => import('./LiveStreaming.svelte'),
};
