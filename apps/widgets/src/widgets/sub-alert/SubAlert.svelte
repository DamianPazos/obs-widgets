<script lang="ts">
  import { onMount } from 'svelte';
  import { makeEvent, type SubscriptionNewEvent } from '@obs-widgets/core';
  import Positionable from '../../components/Positionable.svelte';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';
  import { isImageUrl, themeStyle } from '../../lib/style';
  import { createLayoutController } from '../../lib/editor.svelte';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const durationMs = Number(getParam('duration', '6000')) || 6000;
  const accent = `#${getParam('accent', 'a855f7')}`;
  const labelNew = getParam('labelNew', '¡Nueva suscripción!');
  const labelRenewal = getParam('labelRenewal', '¡Renovó su sub!');
  const labelGift = getParam('labelGift', '¡Regaló subs!');
  const icon = getParam('icon', '💜');
  const isPreview = getParam('preview') === '1';
  const width = Number(getParam('width', '460')) || 460;
  const height = Number(getParam('height', '180')) || 180;

  const ed = createLayoutController({
    icon: { x: 16, y: 50 },
    label: { x: 58, y: 30 },
    name: { x: 58, y: 55 },
    detail: { x: 58, y: 78 },
  });

  let current = $state<SubscriptionNewEvent | null>(null);
  let status = $state<ConnectionStatus>('connecting');

  const queue: SubscriptionNewEvent[] = [];
  let showing = false;

  function labelFor(event: SubscriptionNewEvent): string {
    const kind = event.payload.kind ?? 'new';
    if (kind === 'renewal') return labelRenewal;
    if (kind === 'gift') return labelGift;
    return labelNew;
  }

  function detailFor(event: SubscriptionNewEvent): string {
    const { kind = 'new', months = 1, count } = event.payload;
    if (kind === 'gift') {
      const n = count ?? 1;
      return `x${n} sub${n === 1 ? '' : 's'}`;
    }
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  function demoEvent(kind: 'new' | 'renewal' | 'gift'): SubscriptionNewEvent {
    const payload =
      kind === 'gift'
        ? { username: 'Regalón', kind, months: 1, count: 5 }
        : { username: 'Nombre_Ejemplo', kind, months: kind === 'renewal' ? 7 : 1 };
    return makeEvent<SubscriptionNewEvent>({ type: 'subscription.new', channel, payload });
  }

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

  onMount(() => {
    if (ed.edit) {
      status = 'open';
      current = demoEvent('new');
      return;
    }

    if (isPreview) {
      status = 'open';
      const kinds = ['new', 'renewal', 'gift'] as const;
      let i = 0;
      const demo = () => {
        queue.push(demoEvent(kinds[i++ % kinds.length]!));
        showNext();
      };
      demo();
      const id = setInterval(demo, durationMs + 1200);
      return () => clearInterval(id);
    }

    return connectEvents({
      serverUrl,
      channel,
      events: ['subscription.new'],
      onEvent: (event) => {
        if (event.type !== 'subscription.new') return;
        queue.push(event);
        showNext();
      },
      onStatus: (next) => (status = next),
    });
  });
</script>

<div class="stage" style="--accent: {accent}; {themeStyle()}">
  {#if current}
    <div class="canvas" class:edit={ed.edit} style="width: {width}px; height: {height}px">
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
        <span class="label">{labelFor(current)}</span>
      </Positionable>
      <Positionable
        id="name"
        pos={ed.layout.name}
        edit={ed.edit}
        selected={ed.selected === 'name'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        <strong class="name">{current.payload.username}</strong>
      </Positionable>
      <Positionable
        id="detail"
        pos={ed.layout.detail}
        edit={ed.edit}
        selected={ed.selected === 'detail'}
        snap={ed.snap}
        onmove={ed.move}
        oncommit={ed.commit}
        onselect={ed.select}
      >
        <span class="detail">{detailFor(current)}</span>
      </Positionable>
    </div>
  {/if}
</div>

{#if !isPreview && !ed.edit && status !== 'open'}
  <div class="conn" title="Estado de la conexión con el servidor">● {status}</div>
{/if}

<style>
  .stage {
    font-family: var(--w-font, inherit);
    color: var(--w-fg, #fff);
    transform: scale(var(--w-scale, 1));
    transform-origin: center;
  }

  .canvas {
    position: relative;
    background: linear-gradient(135deg, var(--accent), rgba(0, 0, 0, 0.35));
    border-radius: var(--w-radius, 16px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    animation: fade 0.4s ease;
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

  .label {
    font-size: 0.9rem;
    font-weight: var(--w-font-weight, 600);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.9;
  }

  .name {
    font-size: 1.8rem;
    font-weight: var(--w-font-weight, 700);
  }

  .detail {
    font-size: 1rem;
    font-weight: var(--w-font-weight, 600);
    opacity: 0.85;
  }

  .conn {
    position: fixed;
    bottom: 8px;
    right: 12px;
    font-size: 0.75rem;
    color: #ff5f5f;
    opacity: 0.7;
  }

  @keyframes fade {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bounce {
    to {
      transform: translateY(-6px);
    }
  }
</style>
