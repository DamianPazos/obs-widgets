import type { WidgetManifest } from '../../lib/manifest';
import { styleParams } from '../../lib/style';

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
    { name: 'clock', label: 'Mostrar reloj', type: 'boolean', default: true },
    {
      name: 'width',
      label: 'Ancho del lienzo (px)',
      type: 'range',
      default: 460,
      min: 160,
      max: 1200,
      step: 10,
    },
    {
      name: 'height',
      label: 'Alto del lienzo (px)',
      type: 'range',
      default: 110,
      min: 60,
      max: 600,
      step: 10,
    },
    ...styleParams(
      'scale',
      'font',
      'fontWeight',
      'fg',
      'bg',
      'bgOpacity',
      'borderWidth',
      'borderColor',
      'radius',
      'bgImage',
    ),
  ],
  elements: [
    { id: 'dot', label: 'Punto en vivo' },
    { id: 'title', label: 'Título' },
    { id: 'subtitle', label: 'Subtítulo' },
    { id: 'clock', label: 'Reloj' },
  ],
  load: () => import('./LiveStreaming.svelte'),
};
