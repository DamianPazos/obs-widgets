<script lang="ts">
  import { onMount } from 'svelte';
  import type { StreamViewersEvent } from '@obs-widgets/core';
  import Positionable from '../../components/Positionable.svelte';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';
  import { isImageUrl, themeStyle } from '../../lib/style';
  import { createLayoutController } from '../../lib/editor.svelte';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const label = getParam('label', 'espectadores');
  const icon = getParam('icon', '👁️');
  const accent = `#${getParam('accent', '53fc18')}`;
  const hideOffline = getParam('hideOffline', 'true') !== 'false';
  const isPreview = getParam('preview') === '1';
  const width = Number(getParam('width', '260')) || 260;
  const height = Number(getParam('height', '120')) || 120;

  const ed = createLayoutController({
    icon: { x: 22, y: 50 },
    count: { x: 62, y: 42 },
    label: { x: 62, y: 70 },
  });

  let viewers = $state(0);
  let live = $state(false);
  let status = $state<ConnectionStatus>('connecting');
  let display = $state(0);

  const visible = $derived(live || !hideOffline);
  const shown = $derived(Math.round(display).toLocaleString('es-AR'));

  // Animación suave del número cuando cambia (easeOutCubic).
  let raf = 0;
  function animateTo(target: number): void {
    cancelAnimationFrame(raf);
    const from = display;
    const start = performance.now();
    const dur = 600;
    const step = (t: number): void => {
      const k = Math.min(1, (t - start) / dur);
      display = from + (target - from) * (1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function apply(event: StreamViewersEvent): void {
    live = event.payload.live;
    viewers = event.payload.viewers;
    animateTo(viewers);
  }

  onMount(() => {
    if (ed.edit || isPreview) {
      status = 'open';
      live = true;
      viewers = 128;
      animateTo(128);
      return () => cancelAnimationFrame(raf);
    }

    const disconnect = connectEvents({
      serverUrl,
      channel,
      events: ['stream.viewers'],
      onEvent: (event) => {
        if (event.type === 'stream.viewers') apply(event);
      },
      onStatus: (next) => (status = next),
    });

    return () => {
      cancelAnimationFrame(raf);
      disconnect();
    };
  });
</script>

<div class="stage" style="--accent: {accent}; {themeStyle()}">
  {#if visible}
    <div
      class="canvas"
      class:offline={!live}
      class:edit={ed.edit}
      style="width: {width}px; height: {height}px"
    >
      {#if ed.grid}
        <div class="grid" style="background-size: {ed.snap || 5}% {ed.snap || 5}%"></div>
      {/if}
      <Positionable
        id="icon"
        pos={ed.layout.icon}
        edit={ed.edit}
        selected={ed.selected === 'icon'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        {#if isImageUrl(icon)}
          <img class="icon-img" src={icon} alt="" />
        {:else}
          <span class="icon">{icon}</span>
        {/if}
      </Positionable>
      <Positionable
        id="count"
        pos={ed.layout.count}
        edit={ed.edit}
        selected={ed.selected === 'count'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        <strong class="count">{live ? shown : '—'}</strong>
      </Positionable>
      <Positionable
        id="label"
        pos={ed.layout.label}
        edit={ed.edit}
        selected={ed.selected === 'label'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        <span class="label">{label}</span>
      </Positionable>
    </div>
  {/if}
</div>

{#if !isPreview && !ed.edit && status !== 'open'}
  <div class="conn" title="Estado de la conexión con el servidor">● {status}</div>
{/if}

<style>
  .stage {
    color: var(--w-fg, #fff);
    font-family: var(--w-font, inherit);
    transform: scale(var(--w-scale, 1));
    transform-origin: center;
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

  .canvas.offline {
    border-color: #4b515e;
    opacity: 0.85;
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

  .icon {
    font-size: 1.6rem;
    line-height: 1;
    color: var(--accent);
  }

  .icon-img {
    width: 1.9rem;
    height: 1.9rem;
    object-fit: contain;
    border-radius: 4px;
  }

  .canvas:not(.offline) .icon,
  .canvas:not(.offline) .icon-img {
    animation: pulse 2s ease-in-out infinite;
  }

  .count {
    font-size: 2rem;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    font-weight: var(--w-font-weight, 800);
  }

  .label {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.75;
  }

  .conn {
    position: fixed;
    bottom: 8px;
    right: 12px;
    font-size: 0.75rem;
    color: #ff5f5f;
    opacity: 0.7;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.12);
      opacity: 0.7;
    }
  }
</style>
