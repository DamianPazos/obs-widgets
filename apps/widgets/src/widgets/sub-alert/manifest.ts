import type { WidgetManifest } from '../../lib/manifest';
import { styleParams } from '../../lib/style';

export const manifest: WidgetManifest = {
  id: 'sub-alert',
  name: 'Alerta de Suscripción',
  description:
    'Muestra una animación cuando alguien se suscribe, renueva o regala subs en Kick. Requiere el servidor relay corriendo.',
  mode: 'realtime',
  events: ['subscription.new'],
  params: [
    {
      name: 'channel',
      label: 'Canal de Kick',
      description: 'Vacío = usa el canal configurado en la app.',
      type: 'text',
      default: '',
    },
    { name: 'labelNew', label: 'Texto (nueva sub)', type: 'text', default: '¡Nueva suscripción!' },
    {
      name: 'labelRenewal',
      label: 'Texto (renovación)',
      type: 'text',
      default: '¡Renovó su sub!',
    },
    { name: 'labelGift', label: 'Texto (regalo)', type: 'text', default: '¡Regaló subs!' },
    {
      name: 'icon',
      label: 'Ícono (emoji o imagen)',
      type: 'text',
      default: '💜',
      withUpload: true,
    },
    { name: 'accent', label: 'Color', type: 'color', default: 'a855f7' },
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
      default: 180,
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
    { id: 'detail', label: 'Detalle (meses/cantidad)' },
  ],
  load: () => import('./SubAlert.svelte'),
};
