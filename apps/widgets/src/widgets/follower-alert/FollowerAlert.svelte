<script lang="ts">
  import { onMount } from 'svelte';
  import { makeEvent, type FollowerNewEvent } from '@obs-widgets/core';
  import Positionable from '../../components/Positionable.svelte';
  import { connectEvents, type ConnectionStatus } from '../../lib/event-stream';
  import { getChannel, getParam, getServerUrl } from '../../lib/config';
  import { isImageUrl, themeStyle } from '../../lib/style';
  import { createLayoutController } from '../../lib/editor.svelte';

  const channel = getChannel();
  const serverUrl = getServerUrl();
  const durationMs = Number(getParam('duration', '6000')) || 6000;
  const accent = `#${getParam('accent', '53fc18')}`;
  const title = getParam('title', '¡Nuevo seguidor!');
  // Mensaje que se muestra cuando no sabemos el nombre (vía kick-ws).
  const subtitle = getParam('subtitle', '¡Gracias por sumarte! 💚');
  const icon = getParam('icon', '💚');
  const isPreview = getParam('preview') === '1';
  const width = Number(getParam('width', '460')) || 460;
  const height = Number(getParam('height', '170')) || 170;

  const ed = createLayoutController({
    icon: { x: 16, y: 50 },
    label: { x: 58, y: 36 },
    name: { x: 58, y: 62 },
  });

  let current = $state<FollowerNewEvent | null>(null);
  let status = $state<ConnectionStatus>('connecting');

  const queue: FollowerNewEvent[] = [];
  let showing = false;

  // Nombre real si Kick lo informa; si no, el mensaje genérico.
  const message = $derived(current?.payload.username ?? subtitle);

  function demoEvent(): FollowerNewEvent {
    // En kick-ws no llega el nombre: el demo lo refleja (muestra el mensaje).
    return makeEvent<FollowerNewEvent>({ type: 'follower.new', channel, payload: {} });
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
      current = demoEvent();
      return;
    }

    if (isPreview) {
      status = 'open';
      const demo = () => {
        queue.push(demoEvent());
        showNext();
      };
      demo();
      const id = setInterval(demo, durationMs + 1200);
      return () => clearInterval(id);
    }

    return connectEvents({
      serverUrl,
      channel,
      events: ['follower.new'],
      onEvent: (event) => {
        if (event.type !== 'follower.new') return;
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
      <div class="card-bg">
        <span class="shine"></span>
      </div>
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
        <span class="label">{title}</span>
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
        <strong class="name" class:is-message={!current.payload.username}>{message}</strong>
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
    animation: pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }

  /* Fondo del card en su propia capa: así el brillo se recorta a los bordes
     redondeados sin cortar los objetos (ícono/textos) que van encima. */
  .card-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: var(--w-radius, 18px);
    background:
      radial-gradient(130% 130% at 0% 0%, rgba(255, 255, 255, 0.22), transparent 55%),
      linear-gradient(135deg, var(--accent), rgba(0, 0, 0, 0.5));
    box-shadow:
      0 16px 46px rgba(0, 0, 0, 0.5),
      0 0 34px -6px var(--accent),
      inset 0 0 0 1px rgba(255, 255, 255, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  /* Barrido de luz que cruza el card al aparecer. */
  .shine {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 60%;
    left: -70%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent);
    transform: skewX(-18deg);
    animation: sweep 2.6s ease-in-out 0.35s;
  }

  .canvas.edit .card-bg {
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
    font-size: 2.6rem;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35));
    animation: bounce 0.9s ease infinite alternate;
  }

  .icon-img {
    width: 2.85rem;
    height: 2.85rem;
    object-fit: contain;
    border-radius: 10px;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35));
    animation: bounce 0.9s ease infinite alternate;
  }

  .label {
    font-size: 0.92rem;
    font-weight: var(--w-font-weight, 700);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.92;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .name {
    font-size: 1.95rem;
    font-weight: var(--w-font-weight, 800);
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
  }

  /* Cuando es el mensaje genérico (sin nombre real) achicamos un poco. */
  .name.is-message {
    font-size: 1.4rem;
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
      opacity: 0;
      transform: translateY(12px) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes sweep {
    to {
      left: 130%;
    }
  }

  @keyframes bounce {
    to {
      transform: translateY(-6px);
    }
  }
</style>
