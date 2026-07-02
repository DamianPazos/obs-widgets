<script lang="ts">
  import type { Snippet } from 'svelte';
  import { clamp, type Point } from '../lib/layout';

  let {
    id,
    pos,
    edit = false,
    onmove,
    oncommit,
    children,
  }: {
    id: string;
    pos: Point;
    edit?: boolean;
    /** Se llama en vivo mientras se arrastra. */
    onmove?: (id: string, p: Point) => void;
    /** Se llama al soltar (para persistir/avisar). */
    oncommit?: () => void;
    children: Snippet;
  } = $props();

  let el: HTMLElement;

  function handleDown(event: PointerEvent): void {
    if (!edit) return;
    event.preventDefault();
    event.stopPropagation();

    const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement;
    if (!parent) return;

    const onPointerMove = (ev: PointerEvent): void => {
      const rect = parent.getBoundingClientRect();
      const x = clamp(((ev.clientX - rect.left) / rect.width) * 100);
      const y = clamp(((ev.clientY - rect.top) / rect.height) * 100);
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
  style="left: {pos.x}%; top: {pos.y}%"
  onpointerdown={handleDown}
>
  {@render children()}
</div>

<style>
  .positionable {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
  }

  .positionable.edit {
    cursor: move;
    touch-action: none;
    outline: 1px dashed rgba(255, 255, 255, 0.55);
    outline-offset: 4px;
    border-radius: 4px;
  }
</style>
