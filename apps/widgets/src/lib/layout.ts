/**
 * Posición de los objetos dentro de un widget. Cada elemento se ubica por
 * porcentaje (0–100) relativo al lienzo del widget, con ancla en su centro.
 *
 * El layout se serializa en la URL como `layout=id:x,y|id:x,y` y se edita
 * arrastrando en el panel (modo `?edit=1`).
 */
export interface Point {
  x: number;
  y: number;
}

export type Layout = Record<string, Point>;

export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Combina el layout de la URL con los valores por defecto del widget.
 * Es genérico para devolver la misma forma concreta que `defaults` (así el
 * widget accede a `layout.icono` sin lidiar con `undefined`).
 */
export function parseLayout<T extends Layout>(raw: string | null, defaults: T): T {
  const out: Layout = {};
  for (const id of Object.keys(defaults)) out[id] = { ...defaults[id]! };

  if (raw) {
    for (const part of raw.split('|')) {
      const [id, coords] = part.split(':');
      if (!id || !coords || !(id in defaults)) continue;
      const [xs, ys] = coords.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        out[id] = { x: clamp(x), y: clamp(y) };
      }
    }
  }
  return out as T;
}

/** Serializa un layout para la URL. */
export function encodeLayout(layout: Layout): string {
  return Object.entries(layout)
    .map(([id, p]) => `${id}:${Math.round(p.x)},${Math.round(p.y)}`)
    .join('|');
}

/** ¿Estamos en modo edición (arrastre)? */
export function isEditMode(): boolean {
  return new URLSearchParams(window.location.search).get('edit') === '1';
}

/** Layout crudo de la URL (o null). */
export function getLayoutParam(): string | null {
  return new URLSearchParams(window.location.search).get('layout');
}

/** Mensaje que el widget (en un iframe) manda al panel con el layout nuevo. */
export const LAYOUT_MESSAGE = 'obs-widget-layout';
