<script lang="ts">
  import { onMount } from 'svelte';
  import { makeEvent, type FollowerNewEvent } from '@obs-widgets/core';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';
  import { isImageUrl, themeStyle } from '../../lib/style';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const durationMs = Number(getParam('duration', '6000')) || 6000;
  const accent = `#${getParam('accent', '53fc18')}`;
  const title = getParam('title', '¡Nuevo seguidor!');
  const icon = getParam('icon', '💚');
  const isPreview = getParam('preview') === '1';

  let current = $state<FollowerNewEvent | null>(null);
  let status = $state<ConnectionStatus>('connecting');

  const queue: FollowerNewEvent[] = [];
  let showing = false;

  function showNext(): void {
    if (showing) return;
    const event = queue.shift();
    if (!event) return;
    showing = true;
    current = event;
    setTimeout(() => {
      current = null;
      showing = false;
      setTimeout(showNext, 400);
    }, durationMs);
  }

  function enqueue(event: FollowerNewEvent): void {
    queue.push(event);
    showNext();
  }

  onMount(() => {
    if (isPreview) {
      status = 'open';
      const demo = () =>
        enqueue(
          makeEvent<FollowerNewEvent>({
            type: 'follower.new',
            channel,
            payload: { username: 'Nombre_Ejemplo' },
          }),
        );
      demo();
      const id = setInterval(demo, durationMs + 1200);
      return () => clearInterval(id);
    }

    return connectEvents({
      serverUrl,
      channel,
      events: ['follower.new'],
      onEvent: (event) => {
        if (event.type === 'follower.new') enqueue(event);
      },
      onStatus: (next) => (status = next),
    });
  });
</script>

{#if current}
  <div class="alert-wrap" style="--accent: {accent}; {themeStyle()}">
    <div class="alert">
      {#if isImageUrl(icon)}
        <img class="icon-img" src={icon} alt="" />
      {:else}
        <span class="icon">{icon}</span>
      {/if}
      <div class="body">
        <span class="label">{title}</span>
        <strong class="name">{current.payload.username}</strong>
      </div>
    </div>
  </div>
{/if}

{#if !isPreview && status !== 'open'}
  <div class="conn" title="Estado de la conexión con el servidor">● {status}</div>
{/if}

<style>
  .alert-wrap {
    font-family: var(--w-font, inherit);
    color: var(--w-fg, #fff);
    transform: scale(var(--w-scale, 1));
    transform-origin: center;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.75rem;
    background: linear-gradient(135deg, var(--accent), rgba(0, 0, 0, 0.35));
    color: inherit;
    border-radius: var(--w-radius, 16px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    animation:
      pop 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28),
      fade 0.4s ease;
  }

  .icon {
    font-size: 2.5rem;
    animation: bounce 0.9s ease infinite alternate;
  }

  .icon-img {
    width: 2.75rem;
    height: 2.75rem;
    object-fit: contain;
    border-radius: 8px;
    animation: bounce 0.9s ease infinite alternate;
  }

  .body {
    display: flex;
    flex-direction: column;
  }

  .label {
    font-size: 0.9rem;
    font-weight: var(--w-font-weight, 600);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.9;
  }

  .name {
    font-size: 1.9rem;
    line-height: 1.1;
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

  @keyframes pop {
    from {
      transform: scale(0.7) translateY(20px);
    }
    to {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes bounce {
    to {
      transform: translateY(-8px);
    }
  }
</style>
