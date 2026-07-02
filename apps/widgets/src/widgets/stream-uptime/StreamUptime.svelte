<script lang="ts">
  import { onMount } from 'svelte';
  import type { StreamStatusEvent } from '@obs-widgets/core';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const label = getParam('label', 'EN VIVO');
  const icon = getParam('icon', '🔴');
  const accent = `#${getParam('accent', '53fc18')}`;
  const hideOffline = getParam('hideOffline', 'true') !== 'false';
  const isPreview = getParam('preview') === '1';

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

    if (isPreview) {
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

{#if visible}
  <div class="uptime" class:offline={!live} style="--accent: {accent}">
    <span class="icon">{icon}</span>
    <div class="body">
      <span class="label">{live ? label : 'OFFLINE'}</span>
      <strong class="time">{fmt(elapsed)}</strong>
    </div>
  </div>
{/if}

{#if !isPreview && status !== 'open'}
  <div class="conn" title="Estado de la conexión con el servidor">● {status}</div>
{/if}

<style>
  .uptime {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.7rem 1.15rem;
    background: rgba(13, 15, 20, 0.85);
    border: 1px solid var(--accent);
    border-radius: 12px;
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    color: #fff;
  }

  .uptime.offline {
    border-color: #4b515e;
    opacity: 0.85;
  }

  .icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .uptime:not(.offline) .icon {
    animation: blink 1.6s ease-in-out infinite;
  }

  .body {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .label {
    font-size: 0.72rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #c3c9d2;
  }

  .time {
    font-size: 1.6rem;
    font-variant-numeric: tabular-nums;
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
