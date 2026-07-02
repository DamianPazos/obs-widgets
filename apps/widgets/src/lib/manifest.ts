import type { Component } from 'svelte';
import type { WidgetEventType } from '@obs-widgets/core';

/** Tipo de control con el que se edita un parámetro en el panel de config. */
export type WidgetParamType =
  'text' | 'color' | 'number' | 'range' | 'boolean' | 'select' | 'image';

/** Opción para parámetros de tipo `select`. */
export interface WidgetParamOption {
  value: string;
  label: string;
}

/**
 * Parámetro configurable de un widget vía query string.
 *
 * A partir de estos metadatos, el panel de configuración genera el formulario
 * automáticamente (color pickers, campos, toggles, selects). El `default` debe
 * coincidir con el fallback que usa el widget al leer el parámetro.
 *
 * Nota: los colores viajan en la URL SIN el `#` (ej. `accent=53fc18`); el
 * widget le antepone el `#` y el panel se encarga del color picker.
 */
export interface WidgetParam {
  /** Nombre del parámetro en la URL (?name=valor). */
  name: string;
  /** Etiqueta legible para el formulario. */
  label: string;
  /** Ayuda opcional. */
  description?: string;
  /** Tipo de control en el formulario. */
  type: WidgetParamType;
  /** Valor por defecto (debe coincidir con el fallback del widget). */
  default: string | number | boolean;
  /** Opciones para `type: 'select'`. */
  options?: WidgetParamOption[];
  /** Límites para `type: 'number'`. */
  min?: number;
  max?: number;
  step?: number;
  /** Para `type: 'text'`: además del texto (emoji), permite subir una imagen. */
  withUpload?: boolean;
}

/**
 * Metadatos que describen un widget. Cada widget exporta un `manifest` y el
 * registry los descubre automáticamente (ver registry.ts).
 */
export interface WidgetManifest {
  /** Identificador único, usado en la URL: `?widget=<id>`. */
  id: string;
  /** Nombre legible para el listado. */
  name: string;
  /** Descripción corta. */
  description: string;
  /** `offline` = no necesita servidor. `realtime` = consume eventos por WebSocket. */
  mode: 'offline' | 'realtime';
  /** Tipos de eventos que consume (solo para modo realtime). */
  events?: WidgetEventType[];
  /** Parámetros configurables por query string. */
  params?: WidgetParam[];
  /** Objetos posicionables del widget (para el editor / panel contextual). */
  elements?: { id: string; label: string }[];
  /** Carga diferida del componente Svelte (code-splitting por widget). */
  load: () => Promise<{ default: Component }>;
}
