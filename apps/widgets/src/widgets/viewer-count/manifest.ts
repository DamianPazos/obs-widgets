import type { WidgetManifest } from '../../lib/manifest';
import { styleParams } from '../../lib/style';

export const manifest: WidgetManifest = {
  id: 'viewer-count',
  name: 'Contador de Espectadores',
  description:
    'Muestra en vivo cuánta gente te está viendo en Kick. El servidor consulta el número cada pocos segundos.',
  mode: 'realtime',
  events: ['stream.viewers'],
  params: [
    {
      name: 'channel',
      label: 'Canal de Kick',
      description: 'Vacío = usa el canal configurado en la app.',
      type: 'text',
      default: '',
    },
    { name: 'label', label: 'Etiqueta', type: 'text', default: 'espectadores' },
    {
      name: 'icon',
      label: 'Ícono (emoji o imagen)',
      type: 'text',
      default: '👁️',
      withUpload: true,
    },
    { name: 'accent', label: 'Color', type: 'color', default: '53fc18' },
    {
      name: 'hideOffline',
      label: 'Ocultar cuando está offline',
      type: 'boolean',
      default: true,
    },
    {
      name: 'server',
      label: 'Servidor (WebSocket)',
      description: 'Avanzado: URL del servidor relay.',
      type: 'text',
      default: 'ws://localhost:8787',
    },
    {
      name: 'width',
      label: 'Ancho del lienzo (px)',
      type: 'range',
      default: 260,
      min: 120,
      max: 900,
      step: 10,
    },
    {
      name: 'height',
      label: 'Alto del lienzo (px)',
      type: 'range',
      default: 120,
      min: 60,
      max: 500,
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
    { id: 'icon', label: 'Ícono' },
    { id: 'count', label: 'Número' },
    { id: 'label', label: 'Etiqueta' },
  ],
  load: () => import('./ViewerCount.svelte'),
};
