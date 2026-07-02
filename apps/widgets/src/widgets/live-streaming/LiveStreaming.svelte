<script lang="ts">
  import { onMount } from 'svelte';
  import { getParam } from '../../lib/config';

  const title = getParam('title', 'EN VIVO');
  const subtitle = getParam('subtitle', 'Bienvenidos al stream');
  const accent = `#${getParam('accent', '53fc18')}`;
  const showClock = getParam('clock', 'true') !== 'false';

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

<div class="banner" style="--accent: {accent}">
  <span class="dot"></span>
  <div class="text">
    <strong>{title}</strong>
    <span>{subtitle}</span>
  </div>
  {#if showClock}<time>{clock}</time>{/if}
</div>

<style>
  .banner {
    display: inline-flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.75rem 1.25rem;
    background: rgba(13, 15, 20, 0.85);
    border: 1px solid var(--accent);
    border-radius: 12px;
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    color: #fff;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 var(--accent);
    animation: pulse 1.8s infinite;
  }

  .text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .text strong {
    font-size: 1.1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .text span {
    font-size: 0.85rem;
    color: #c3c9d2;
  }

  time {
    margin-left: 0.5rem;
    font-variant-numeric: tabular-nums;
    font-size: 1rem;
    color: #dfe4ea;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 70%, transparent);
    }
    70% {
      box-shadow: 0 0 0 12px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
</style>
