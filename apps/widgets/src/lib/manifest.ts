import type { Component } from 'svelte';
import type { WidgetEventType } from '@obs-widgets/core';

/** Parámetro configurable de un widget vía query string. */
export interface WidgetParam {
  name: string;
  description: string;
  example?: string;
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
  /** Carga diferida del componente Svelte (code-splitting por widget). */
  load: () => Promise<{ default: Component }>;
}
