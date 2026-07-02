<script lang="ts">
  import type { Snippet } from 'svelte';
  import { clamp, snap as snapTo, type Point } from '../lib/layout';

  let {
    id,
    pos,
    edit = false,
    selected = false,
    snap = 0,
    onmove,
    oncommit,
    onselect,
    children,
  }: {
    id: string;
    pos: Point;
    edit?: boolean;
    selected?: boolean;
    /** Paso de la grilla en % (0 = sin snap). */
    snap?: number;
    onmove?: (id: string, p: Point) => void;
    oncommit?: () => void;
    onselect?: (id: string) => void;
    children: Snippet;
  } = $props();

  let el: HTMLElement;

  function handleDown(event: PointerEvent): void {
    if (!edit) return;
    event.preventDefault();
    event.stopPropagation();
    onselect?.(id);

    const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement;
    if (!parent) return;

    const onPointerMove = (ev: PointerEvent): void => {
      const rect = parent.getBoundingClientRect();
      const x = snapTo(clamp(((ev.clientX - rect.left) / rect.width) * 100), snap);
      const y = snapTo(clamp(((ev.clientY - rect.top) / rect.height) * 100), snap);
      onmove?.(id, { x, y });
    };

    const onPointerUp = (): void => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      oncommit?.();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={el}
  class="positionable"
  class:edit
  class:selected
  style="left: {pos.x}%; top: {pos.y}%; transform: translate(-50%, -50%) scale({pos.s ?? 1})"
  onpointerdown={handleDown}
>
  {@render children()}
</div>

<style>
  .positionable {
    position: absolute;
    white-space: nowrap;
  }

  .positionable.edit {
    cursor: move;
    touch-action: none;
    outline: 1px dashed rgba(255, 255, 255, 0.5);
    outline-offset: 4px;
    border-radius: 4px;
  }

  .positionable.edit.selected {
    outline: 2px solid var(--accent, #53fc18);
    outline-offset: 5px;
    box-shadow: 0 0 0 4px rgba(83, 252, 24, 0.15);
  }
</style>
