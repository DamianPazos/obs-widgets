/**
 * Modelo de "escena": una composición de varias instancias de widgets, cada una
 * con su configuración (params) y su rectángulo (posición + tamaño en % del
 * lienzo 16:9 de OBS). La escena se serializa entera en la URL (`?scene=<b64>`),
 * autocontenida, para cargarla en una sola Browser Source.
 */

export interface Rect {
  /** % del ancho de la escena (0–100), esquina superior izquierda. */
  x: number;
  /** % del alto de la escena. */
  y: number;
  /** ancho en %. */
  w: number;
  /** alto en %. */
  h: number;
}

export interface SceneInstance {
  id: string;
  widget: string;
  params: Record<string, string>;
  rect: Rect;
}

export interface Scene {
  instances: SceneInstance[];
  /** Tamaño del lienzo (px), para el aspecto del builder / la salida de OBS. */
  canvas?: { w: number; h: number };
}

export const DEFAULT_CANVAS = { w: 1920, h: 1080 };

/** Presets comunes de tamaño de pantalla/lienzo. */
export const CANVAS_PRESETS = [
  { label: '1920×1080 · 16:9 (Full HD)', w: 1920, h: 1080 },
  { label: '2560×1440 · 16:9 (1440p)', w: 2560, h: 1440 },
  { label: '1280×720 · 16:9 (HD)', w: 1280, h: 720 },
  { label: '1080×1920 · 9:16 (vertical)', w: 1080, h: 1920 },
  { label: '3440×1440 · 21:9 (ultrawide)', w: 3440, h: 1440 },
];

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeScene(scene: Scene): string {
  return toBase64Url(JSON.stringify(scene));
}

export function decodeScene(raw: string | null): Scene {
  if (!raw) return { instances: [] };
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as Scene;
    if (parsed && Array.isArray(parsed.instances)) return parsed;
  } catch {
    /* datos inválidos */
  }
  return { instances: [] };
}

/** URL del widget de una instancia (para el iframe). */
export function instanceUrl(inst: SceneInstance, extra: Record<string, string> = {}): string {
  const usp = new URLSearchParams({ widget: inst.widget, ...inst.params, ...extra });
  return `${window.location.origin}/?${usp.toString()}`;
}

/** Genera un id corto para una instancia nueva. */
export function newInstanceId(): string {
  return Math.random().toString(36).slice(2, 9);
}
