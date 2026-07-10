<script lang="ts">
  import Builder from './components/Builder.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import Connect from './components/Connect.svelte';
  import Index from './components/Index.svelte';
  import SceneView from './components/SceneView.svelte';
  import { getWidget } from './lib/registry';

  const params = new URLSearchParams(window.location.search);
  const sceneData = params.get('scene');
  const isBuilder = params.get('builder') != null;
  const isConnect = params.get('connect') != null;
  const configId = params.get('config');
  const id = params.get('widget');
  const widget = id ? getWidget(id) : undefined;

  // Modo "fit": el widget escala para llenar su contenedor (usado en escenas).
  const fit = params.get('fit') === '1';
  let hostEl: HTMLElement | undefined = $state();
  let innerEl: HTMLElement | undefined = $state();

  $effect(() => {
    if (!fit || !hostEl || !innerEl) return;
    const host = hostEl;
    const inner = innerEl;
    const apply = () => {
      const cw = inner.offsetWidth;
      const ch = inner.offsetHeight;
      if (!cw || !ch) return;
      const k = Math.min(host.clientWidth / cw, host.clientHeight / ch);
      inner.style.transform = `scale(${k})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    ro.observe(inner);
    return () => ro.disconnect();
  });
</script>

{#if sceneData != null}
  <SceneView />
{:else if isBuilder}
  <Builder />
{:else if isConnect}
  <Connect />
{:else if configId}
  <ConfigPanel />
{:else if !id}
  <Index />
{:else if !widget}
  <div class="error">
    <p>No existe un widget con id <code>{id}</code>.</p>
    <a href="/">Ver widgets disponibles</a>
  </div>
{:else}
  {#await widget.load() then mod}
    {@const Widget = mod.default}
    <div class="widget-host" class:fit bind:this={hostEl}>
      <div class="widget-inner" bind:this={innerEl}>
        <Widget />
      </div>
    </div>
  {/await}
{/if}

<style>
  /* Centra el contenido de CUALQUIER widget en el canvas del Browser Source. */
  .widget-host {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .widget-inner {
    display: inline-block;
    transform-origin: center;
  }

  .widget-host.fit .widget-inner {
    /* el $effect ajusta el scale para llenar el contenedor */
    will-change: transform;
  }

  .error {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #14161c;
    color: #fff;
  }

  .error code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }

  .error a {
    color: #53fc18;
  }
</style>
