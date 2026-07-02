import type { WidgetManifest } from '../../lib/manifest';
import { styleParams } from '../../lib/style';

export const manifest: WidgetManifest = {
  id: 'stream-uptime',
  name: 'Tiempo en Vivo (Uptime)',
  description:
    'Cuenta cuánto hace que estás en vivo. Detecta solo cuándo arranca y cuándo termina el stream (Kick).',
  mode: 'realtime',
  events: ['stream.status'],
  params: [
    { name: 'channel', label: 'Canal de Kick', type: 'text', default: 'demo' },
    { name: 'label', label: 'Etiqueta', type: 'text', default: 'EN VIVO' },
    {
      name: 'icon',
      label: 'Ícono (emoji o imagen)',
      type: 'text',
      default: '🔴',
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
      default: 360,
      min: 160,
      max: 1200,
      step: 10,
    },
    {
      name: 'height',
      label: 'Alto del lienzo (px)',
      type: 'range',
      default: 150,
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
    { id: 'icon', label: 'Ícono' },
    { id: 'label', label: 'Etiqueta' },
    { id: 'time', label: 'Timer' },
  ],
  load: () => import('./StreamUptime.svelte'),
};
