import type { WidgetManifest } from '../../lib/manifest';

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
    { name: 'icon', label: 'Ícono / emoji', type: 'text', default: '🔴' },
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
  ],
  load: () => import('./StreamUptime.svelte'),
};
