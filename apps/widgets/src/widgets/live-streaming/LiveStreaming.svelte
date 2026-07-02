<script lang="ts">
  import { onMount } from 'svelte';
  import Positionable from '../../components/Positionable.svelte';
  import { getParam } from '../../lib/config';
  import { themeStyle } from '../../lib/style';
  import { createLayoutController } from '../../lib/editor.svelte';

  const title = getParam('title', 'EN VIVO');
  const subtitle = getParam('subtitle', 'Bienvenidos al stream');
  const accent = `#${getParam('accent', '53fc18')}`;
  const showClock = getParam('clock', 'true') !== 'false';
  const width = Number(getParam('width', '460')) || 460;
  const height = Number(getParam('height', '110')) || 110;

  const ed = createLayoutController({
    dot: { x: 8, y: 50 },
    title: { x: 37, y: 40 },
    subtitle: { x: 37, y: 66 },
    clock: { x: 88, y: 50 },
  });

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
  <div class="canvas" class:edit={ed.edit} style="width: {width}px; height: {height}px">
    {#if ed.grid}
      <div class="grid" style="background-size: {ed.snap || 5}% {ed.snap || 5}%"></div>
    {/if}
    <Positionable
      id="dot"
      pos={ed.layout.dot}
      edit={ed.edit}
      selected={ed.selected === 'dot'}
      snap={ed.snap}
      onmove={ed.move}
      oncommit={ed.commit}
      onselect={ed.select}
    >
      <span class="dot"></span>
    </Positionable>
    <Positionable
      id="title"
      pos={ed.layout.title}
      edit={ed.edit}
      selected={ed.selected === 'title'}
      snap={ed.snap}
      onmove={ed.move}
      oncommit={ed.commit}
      onselect={ed.select}
    >
      <strong class="title">{title}</strong>
    </Positionable>
    <Positionable
      id="subtitle"
      pos={ed.layout.subtitle}
      edit={ed.edit}
      selected={ed.selected === 'subtitle'}
      snap={ed.snap}
      onmove={ed.move}
      oncommit={ed.commit}
      onselect={ed.select}
    >
      <span class="subtitle">{subtitle}</span>
    </Positionable>
    {#if showClock}
      <Positionable
        id="clock"
        pos={ed.layout.clock}
        edit={ed.edit}
        selected={ed.selected === 'clock'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
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

  .grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
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
