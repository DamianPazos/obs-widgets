<script lang="ts">
  import { onMount } from 'svelte';
  import type { StreamStatusEvent } from '@obs-widgets/core';
  import Positionable from '../../components/Positionable.svelte';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';
  import { isImageUrl, themeStyle } from '../../lib/style';
  import { createLayoutController } from '../../lib/editor.svelte';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const label = getParam('label', 'EN VIVO');
  const icon = getParam('icon', '🔴');
  const accent = `#${getParam('accent', '53fc18')}`;
  const hideOffline = getParam('hideOffline', 'true') !== 'false';
  const isPreview = getParam('preview') === '1';
  const width = Number(getParam('width', '360')) || 360;
  const height = Number(getParam('height', '150')) || 150;

  const ed = createLayoutController({
    icon: { x: 18, y: 50 },
    label: { x: 60, y: 36 },
    time: { x: 60, y: 64 },
  });

  let live = $state(false);
  let startedAtMs = $state<number | null>(null);
  let now = $state(Date.now());
  let status = $state<ConnectionStatus>('connecting');

  const elapsed = $derived(live && startedAtMs != null ? Math.max(0, now - startedAtMs) : 0);
  const visible = $derived(live || !hideOffline);

  function fmt(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function applyStatus(event: StreamStatusEvent): void {
    live = event.payload.live;
    const parsed = event.payload.startedAt ? Date.parse(event.payload.startedAt) : Date.now();
    startedAtMs = Number.isNaN(parsed) ? Date.now() : parsed;
  }

  onMount(() => {
    const tick = setInterval(() => (now = Date.now()), 1000);

    if (ed.edit || isPreview) {
      status = 'open';
      live = true;
      startedAtMs = Date.now() - 3_725_000; // ~1h 02m 05s de ejemplo
      return () => clearInterval(tick);
    }

    const disconnect = connectEvents({
      serverUrl,
      channel,
      events: ['stream.status'],
      onEvent: (event) => {
        if (event.type === 'stream.status') applyStatus(event);
      },
      onStatus: (next) => (status = next),
    });

    return () => {
      clearInterval(tick);
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
        id="label"
        pos={ed.layout.label}
        edit={ed.edit}
        selected={ed.selected === 'label'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        <span class="label">{live ? label : 'OFFLINE'}</span>
      </Positionable>
      <Positionable
        id="time"
        pos={ed.layout.time}
        edit={ed.edit}
        selected={ed.selected === 'time'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        <strong class="time">{fmt(elapsed)}</strong>
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
    font-size: 1.25rem;
    line-height: 1;
  }

  .icon-img {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
    border-radius: 4px;
  }

  .canvas:not(.offline) .icon,
  .canvas:not(.offline) .icon-img {
    animation: blink 1.6s ease-in-out infinite;
  }

  .label {
    font-size: 0.72rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .time {
    font-size: 1.6rem;
    font-variant-numeric: tabular-nums;
    font-weight: var(--w-font-weight, 700);
  }

  .conn {
    position: fixed;
    bottom: 8px;
    right: 12px;
    font-size: 0.75rem;
    color: #ff5f5f;
    opacity: 0.7;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
</style>
