import type { WidgetManifest } from './manifest';

/**
 * Registro automático de widgets.
 *
 * Cualquier carpeta `src/widgets/<id>/manifest.ts` que exporte un `manifest`
 * se agrega solo a este listado. Para crear un widget nuevo NO hace falta tocar
 * este archivo: alcanza con crear la carpeta y su manifest.
 */
const modules = import.meta.glob<{ manifest: WidgetManifest }>('../widgets/*/manifest.ts', {
  eager: true,
});

export const widgets: WidgetManifest[] = Object.values(modules)
  .map((mod) => mod.manifest)
  .sort((a, b) => a.name.localeCompare(b.name));

export function getWidget(id: string): WidgetManifest | undefined {
  return widgets.find((widget) => widget.id === id);
}
