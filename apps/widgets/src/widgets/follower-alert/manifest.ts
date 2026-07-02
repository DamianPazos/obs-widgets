import type { WidgetManifest } from '../../lib/manifest';

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
    { name: 'icon', label: 'Ícono / emoji', type: 'text', default: '💚' },
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
  ],
  load: () => import('./FollowerAlert.svelte'),
};
