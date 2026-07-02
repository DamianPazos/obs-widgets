<script lang="ts">
  import { onMount } from 'svelte';
  import Positionable from '../../components/Positionable.svelte';
  import { getParam } from '../../lib/config';
  import { themeStyle } from '../../lib/style';
  import {
    encodeLayout,
    getLayoutParam,
    isEditMode,
    LAYOUT_MESSAGE,
    parseLayout,
    type Layout,
    type Point,
  } from '../../lib/layout';

  const title = getParam('title', 'EN VIVO');
  const subtitle = getParam('subtitle', 'Bienvenidos al stream');
  const accent = `#${getParam('accent', '53fc18')}`;
  const showClock = getParam('clock', 'true') !== 'false';
  const width = Number(getParam('width', '460')) || 460;
  const height = Number(getParam('height', '110')) || 110;

  const DEFAULTS = {
    dot: { x: 8, y: 50 },
    title: { x: 37, y: 40 },
    subtitle: { x: 37, y: 66 },
    clock: { x: 88, y: 50 },
  };

  const edit = isEditMode();
  let layout = $state(parseLayout(getLayoutParam(), DEFAULTS));

  function move(id: string, p: Point): void {
    (layout as Layout)[id] = p;
  }
  function commit(): void {
    window.parent.postMessage(
      { type: LAYOUT_MESSAGE, value: encodeLayout(layout) },
      window.location.origin,
    );
  }

  let now = $state(new Date());
  onMount(() => {
    if (!showClock) return;
    const id = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(id);
  });
  const clock = $derived(
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );
</script>

<div class="stage" style="--accent: {accent}; {themeStyle()}">
  <div class="canvas" class:edit style="width: {width}px; height: {height}px">
    <Positionable id="dot" pos={layout.dot} {edit} onmove={move} oncommit={commit}>
      <span class="dot"></span>
    </Positionable>
    <Positionable id="title" pos={layout.title} {edit} onmove={move} oncommit={commit}>
      <strong class="title">{title}</strong>
    </Positionable>
    <Positionable id="subtitle" pos={layout.subtitle} {edit} onmove={move} oncommit={commit}>
      <span class="subtitle">{subtitle}</span>
    </Positionable>
    {#if showClock}
      <Positionable id="clock" pos={layout.clock} {edit} onmove={move} oncommit={commit}>
        <time>{clock}</time>
      </Positionable>
    {/if}
  </div>
</div>

<style>
  .stage {
    transform: scale(var(--w-scale, 1));
    transform-origin: center;
    font-family: var(--w-font, inherit);
    font-weight: var(--w-font-weight, 400);
    color: var(--w-fg, #fff);
  }

  .canvas {
    position: relative;
    background-color: var(--w-bg, rgba(13, 15, 20, 0.85));
    background-image: var(--w-bg-image, none);
    background-size: cover;
    background-position: center;
    border: var(--w-border-width, 1px) solid var(--w-border-color, var(--accent));
    border-radius: var(--w-radius, 12px);
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  }

  .canvas.edit {
    outline: 2px solid rgba(83, 252, 24, 0.4);
    outline-offset: 2px;
  }

  .dot {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 var(--accent);
    animation: pulse 1.8s infinite;
  }

  .title {
    font-size: 1.1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .subtitle {
    font-size: 0.85rem;
    opacity: 0.75;
  }

  time {
    font-variant-numeric: tabular-nums;
    font-size: 1rem;
    opacity: 0.9;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 var(--accent);
    }
    70% {
      box-shadow: 0 0 0 12px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
</style>
