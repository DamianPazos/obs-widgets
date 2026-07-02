import type { WidgetManifest } from '../../lib/manifest';
import { styleParams } from '../../lib/style';

export const manifest: WidgetManifest = {
  id: 'follower-alert',
  name: 'Alerta de Nuevo Seguidor',
  description:
    'Muestra una animación cuando alguien sigue el canal en Kick. Requiere el servidor relay corriendo.',
  mode: 'realtime',
  events: ['follower.new'],
  params: [
    { name: 'channel', label: 'Canal de Kick', type: 'text', default: 'demo' },
    { name: 'title', label: 'Texto', type: 'text', default: '¡Nuevo seguidor!' },
    {
      name: 'icon',
      label: 'Ícono (emoji o imagen)',
      type: 'text',
      default: '💚',
      withUpload: true,
    },
    { name: 'accent', label: 'Color', type: 'color', default: '53fc18' },
    {
      name: 'duration',
      label: 'Duración (ms)',
      type: 'number',
      default: 6000,
      min: 1000,
      max: 20000,
      step: 500,
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
      default: 460,
      min: 160,
      max: 1200,
      step: 10,
    },
    {
      name: 'height',
      label: 'Alto del lienzo (px)',
      type: 'range',
      default: 170,
      min: 60,
      max: 600,
      step: 10,
    },
    ...styleParams('scale', 'font', 'fontWeight', 'fg', 'radius'),
  ],
  elements: [
    { id: 'icon', label: 'Ícono' },
    { id: 'label', label: 'Texto' },
    { id: 'name', label: 'Nombre' },
  ],
  load: () => import('./FollowerAlert.svelte'),
};
