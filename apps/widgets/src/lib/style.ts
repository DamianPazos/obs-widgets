import { getRawParam } from './config';
import type { WidgetParam } from './manifest';

/**
 * Parámetros de estilo comunes a todos los widgets. Cada widget elige cuáles
 * incluir con `styleParams(...)`, y aplica `themeStyle()` en su elemento raíz.
 *
 * Los valores se traducen a variables CSS (`--w-*`). Un widget referencia esas
 * variables en su CSS con un fallback = su look por defecto, así SOLO cambia lo
 * que el usuario toca; el resto queda igual.
 */
const ALL = {
  scale: { name: 'scale', label: 'Tamaño', type: 'range', default: 1, min: 0.3, max: 3, step: 0.1 },
  font: {
    name: 'font',
    label: 'Tipografía',
    type: 'select',
    default: 'Segoe UI',
    options: [
      { value: 'Segoe UI', label: 'Segoe UI' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Georgia', label: 'Georgia (serif)' },
      { value: 'Times New Roman', label: 'Times' },
      { value: 'Courier New', label: 'Monoespaciada' },
      { value: 'Impact', label: 'Impact' },
      { value: 'Trebuchet MS', label: 'Trebuchet' },
      { value: 'Comic Sans MS', label: 'Comic Sans' },
    ],
  },
  fontWeight: {
    name: 'fontWeight',
    label: 'Grosor de letra',
    type: 'select',
    default: '600',
    options: [
      { value: '400', label: 'Normal' },
      { value: '600', label: 'Semibold' },
      { value: '800', label: 'Bold' },
    ],
  },
  fg: { name: 'fg', label: 'Color de texto', type: 'color', default: 'ffffff' },
  bg: { name: 'bg', label: 'Color de fondo', type: 'color', default: '0d0f14' },
  bgOpacity: {
    name: 'bgOpacity',
    label: 'Opacidad de fondo',
    type: 'range',
    default: 0.85,
    min: 0,
    max: 1,
    step: 0.05,
  },
  borderWidth: {
    name: 'borderWidth',
    label: 'Grosor de borde',
    type: 'range',
    default: 1,
    min: 0,
    max: 12,
    step: 1,
  },
  borderColor: { name: 'borderColor', label: 'Color de borde', type: 'color', default: '53fc18' },
  radius: {
    name: 'radius',
    label: 'Redondeo',
    type: 'range',
    default: 12,
    min: 0,
    max: 40,
    step: 1,
  },
  bgImage: { name: 'bgImage', label: 'Imagen de fondo (URL)', type: 'image', default: '' },
} satisfies Record<string, WidgetParam>;

export type StyleParamName = keyof typeof ALL;

/** Devuelve los parámetros de estilo pedidos (para sumarlos al manifest). */
export function styleParams(...names: StyleParamName[]): WidgetParam[] {
  return names.map((name) => ALL[name]);
}

function stripHash(hex: string): string {
  return hex.replace('#', '');
}

function hexToRgba(hex: string, alpha: number): string {
  const h = stripHash(hex);
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Construye el `style` inline con las variables CSS a partir de la URL.
 * Solo emite las variables de los parámetros presentes: lo que no se toca,
 * mantiene el fallback (look por defecto) definido en el CSS del widget.
 */
export function themeStyle(): string {
  const decls: string[] = [];
  const add = (cssVar: string, value: string | null | undefined) => {
    if (value != null && value !== '') decls.push(`${cssVar}: ${value}`);
  };

  const scale = getRawParam('scale');
  add('--w-scale', scale);
  const font = getRawParam('font');
  add('--w-font', font ? `'${font}', system-ui, sans-serif` : null);
  add('--w-font-weight', getRawParam('fontWeight'));
  const fg = getRawParam('fg');
  add('--w-fg', fg ? `#${stripHash(fg)}` : null);
  const bw = getRawParam('borderWidth');
  add('--w-border-width', bw != null && bw !== '' ? `${bw}px` : null);
  const bc = getRawParam('borderColor');
  add('--w-border-color', bc ? `#${stripHash(bc)}` : null);
  const radius = getRawParam('radius');
  add('--w-radius', radius != null && radius !== '' ? `${radius}px` : null);
  const img = getRawParam('bgImage');
  add('--w-bg-image', img ? `url("${img}")` : null);

  // Fondo: combinamos color + opacidad en un rgba (sin depender de color-mix).
  const bg = getRawParam('bg');
  const opacity = getRawParam('bgOpacity');
  if ((bg != null && bg !== '') || (opacity != null && opacity !== '')) {
    const alpha = opacity != null && opacity !== '' ? Number(opacity) : 0.85;
    add('--w-bg', hexToRgba(bg ?? '0d0f14', alpha));
  }

  return decls.join('; ');
}

/** True si el valor parece una URL de imagen (para usar un ícono como imagen). */
export function isImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
