<script lang="ts">
  import { onMount } from 'svelte';
  import type { FollowerNewEvent } from '@obs-widgets/core';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const durationMs = Number(getParam('duration', '6000')) || 6000;

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

  onMount(() =>
    connectEvents({
      serverUrl,
      channel,
      events: ['follower.new'],
      onEvent: (event) => {
        if (event.type !== 'follower.new') return;
        queue.push(event);
        showNext();
      },
      onStatus: (next) => (status = next),
    }),
  );
</script>

<div class="stage">
  {#if current}
    <div class="alert">
      <div class="icon">💚</div>
      <div class="body">
        <span class="label">¡Nuevo seguidor!</span>
        <strong class="name">{current.payload.username}</strong>
      </div>
    </div>
  {/if}
</div>

{#if status !== 'open'}
  <div class="status" title="Estado de la conexión con el servidor">● {status}</div>
{/if}

<style>
  .stage {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.75rem;
    background: linear-gradient(135deg, rgba(83, 252, 24, 0.95), rgba(28, 160, 12, 0.95));
    color: #06210a;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    animation:
      pop 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28),
      fade 0.4s ease;
  }

  .icon {
    font-size: 2.5rem;
    animation: bounce 0.9s ease infinite alternate;
  }

  .body {
    display: flex;
    flex-direction: column;
  }

  .label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }

  .name {
    font-size: 1.9rem;
    line-height: 1.1;
  }

  .status {
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
