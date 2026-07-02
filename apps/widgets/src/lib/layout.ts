/**
 * Posición de los objetos dentro de un widget. Cada elemento se ubica por
 * porcentaje (0–100) relativo al lienzo, con ancla en su centro, y una escala
 * opcional `s` (tamaño relativo del objeto).
 *
 * Se serializa en la URL como `layout=id:x,y|id:x,y,s` y se edita arrastrando
 * (y con el panel contextual) en modo `?edit=1`.
 */
export interface Point {
  x: number;
  y: number;
  /** Escala del objeto (1 = normal). */
  s?: number;
}

export type Layout = Record<string, Point>;

/** Namespaces de los mensajes postMessage entre el widget (iframe) y el panel. */
export const WIDGET_MSG = 'obs-widget';
export const PANEL_MSG = 'obs-widget-panel';

export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

/** Redondea a la grilla (step en %). step 0 = sin snap. */
export function snap(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}

function parsePoint(coords: string): Point | null {
  const [xs, ys, ss] = coords.split(',');
  const x = Number(xs);
  const y = Number(ys);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const p: Point = { x: clamp(x), y: clamp(y) };
  if (ss !== undefined) {
    const s = Number(ss);
    if (Number.isFinite(s)) p.s = s;
  }
  return p;
}

/**
 * Combina el layout de la URL con los valores por defecto del widget.
 * Genérico para devolver la misma forma concreta que `defaults`.
 */
export function parseLayout<T extends Layout>(raw: string | null, defaults: T): T {
  const out: Layout = {};
  for (const id of Object.keys(defaults)) out[id] = { ...defaults[id]! };

  if (raw) {
    for (const part of raw.split('|')) {
      const [id, coords] = part.split(':');
      if (!id || !coords || !(id in defaults)) continue;
      const p = parsePoint(coords);
      if (p) out[id] = p;
    }
  }
  return out as T;
}

/** Parsea un layout crudo sin defaults (lo usa el panel). */
export function decodeLayout(raw: string | null): Layout {
  const out: Layout = {};
  if (!raw) return out;
  for (const part of raw.split('|')) {
    const [id, coords] = part.split(':');
    if (!id || !coords) continue;
    const p = parsePoint(coords);
    if (p) out[id] = p;
  }
  return out;
}

/** Serializa un layout para la URL. */
export function encodeLayout(layout: Layout): string {
  return Object.entries(layout)
    .map(([id, p]) => {
      const base = `${id}:${Math.round(p.x)},${Math.round(p.y)}`;
      return p.s != null && p.s !== 1 ? `${base},${round2(p.s)}` : base;
    })
    .join('|');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isEditMode(): boolean {
  return new URLSearchParams(window.location.search).get('edit') === '1';
}

export function getLayoutParam(): string | null {
  return new URLSearchParams(window.location.search).get('layout');
}
