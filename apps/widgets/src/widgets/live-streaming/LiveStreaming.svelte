<script lang="ts">
  import { onMount } from 'svelte';
  import { getParam } from '../../lib/config';
  import { themeStyle } from '../../lib/style';

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

<div class="banner" style="--accent: {accent}; {themeStyle()}">
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
    color: var(--w-fg, #fff);
    font-family: var(--w-font, inherit);
    font-weight: var(--w-font-weight, 400);
    background-color: var(--w-bg, rgba(13, 15, 20, 0.85));
    background-image: var(--w-bg-image, none);
    background-size: cover;
    background-position: center;
    border: var(--w-border-width, 1px) solid var(--w-border-color, var(--accent));
    border-radius: var(--w-radius, 12px);
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    transform: scale(var(--w-scale, 1));
    transform-origin: center;
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
    opacity: 0.75;
  }

  time {
    margin-left: 0.5rem;
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
