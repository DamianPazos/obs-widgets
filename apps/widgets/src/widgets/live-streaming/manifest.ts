import type { WidgetManifest } from '../../lib/manifest';

export const manifest: WidgetManifest = {
  id: 'live-streaming',
  name: 'Live Streaming',
  description:
    'Banner "EN VIVO" con reloj y textos configurables. Funciona 100% offline, sin conexión a Kick.',
  mode: 'offline',
  params: [
    { name: 'title', label: 'Título', type: 'text', default: 'EN VIVO' },
    { name: 'subtitle', label: 'Subtítulo', type: 'text', default: 'Bienvenidos al stream' },
    { name: 'accent', label: 'Color de acento', type: 'color', default: '53fc18' },
    {
      name: 'clock',
      label: 'Mostrar reloj',
      type: 'boolean',
      default: true,
    },
  ],
  load: () => import('./LiveStreaming.svelte'),
};
