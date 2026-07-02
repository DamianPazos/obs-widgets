import { getRawParam } from './config';
import {
  decodeLayout,
  encodeLayout,
  getLayoutParam,
  isEditMode,
  PANEL_MSG,
  parseLayout,
  WIDGET_MSG,
  type Layout,
  type Point,
} from './layout';

export interface LayoutController<T extends Layout> {
  readonly layout: T;
  readonly selected: string | null;
  readonly edit: boolean;
  readonly grid: boolean;
  readonly snap: number;
  move(id: string, p: Point): void;
  commit(): void;
  select(id: string): void;
}

/**
 * Estado reactivo del editor de posición dentro de un widget: layout, elemento
 * seleccionado, y el protocolo postMessage con el panel (recibe `set-layout`
 * y `select`; emite `layout` al soltar y `select` al clickear).
 */
export function createLayoutController<T extends Layout>(defaults: T): LayoutController<T> {
  const edit = isEditMode();
  const grid = getRawParam('grid') === '1';
  const snap = Number(getRawParam('snap') ?? '') || 0;

  const layout = $state<T>(parseLayout(getLayoutParam(), defaults));
  let selected = $state<string | null>(null);

  function post(message: Record<string, unknown>): void {
    window.parent.postMessage({ source: WIDGET_MSG, ...message }, window.location.origin);
  }

  function move(id: string, p: Point): void {
    const prev = (layout as Layout)[id];
    (layout as Layout)[id] = { ...prev, x: p.x, y: p.y };
  }

  function commit(): void {
    post({ type: 'layout', value: encodeLayout(layout) });
  }

  function select(id: string): void {
    selected = id;
    post({ type: 'select', id, pos: (layout as Layout)[id] });
  }

  if (edit) {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        source?: string;
        type?: string;
        value?: string;
        id?: string | null;
      } | null;
      if (data?.source !== PANEL_MSG) return;

      if (data.type === 'set-layout' && typeof data.value === 'string') {
        const next = decodeLayout(data.value);
        for (const [id, p] of Object.entries(next)) {
          if (id in (layout as Layout)) (layout as Layout)[id] = p;
        }
      } else if (data.type === 'reset-layout') {
        for (const id of Object.keys(defaults)) (layout as Layout)[id] = { ...defaults[id]! };
      } else if (data.type === 'select') {
        selected = data.id ?? null;
      }
    });
  }

  return {
    get layout() {
      return layout;
    },
    get selected() {
      return selected;
    },
    edit,
    grid,
    snap,
    move,
    commit,
    select,
  };
}
