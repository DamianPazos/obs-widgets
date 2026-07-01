import type { WidgetManifest } from '../../lib/manifest';

export const manifest: WidgetManifest = {
  id: 'follower-alert',
  name: 'Alerta de Nuevo Seguidor',
  description:
    'Muestra una animación cuando alguien sigue el canal en Kick. Requiere el servidor relay corriendo.',
  mode: 'realtime',
  events: ['follower.new'],
  params: [
    { name: 'channel', description: 'Canal de Kick a monitorear', example: 'demo' },
    { name: 'server', description: 'URL del servidor relay', example: 'ws://localhost:8787' },
    { name: 'duration', description: 'Duración de la alerta en ms', example: '6000' },
  ],
  load: () => import('./FollowerAlert.svelte'),
};
