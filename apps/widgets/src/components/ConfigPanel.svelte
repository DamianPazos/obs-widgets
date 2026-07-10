<script lang="ts">
  import { getWidget } from '../lib/registry';
  import WidgetConfig from './WidgetConfig.svelte';
  import UrlLinks from './UrlLinks.svelte';

  const id = new URLSearchParams(window.location.search).get('config') ?? '';
  const widget = getWidget(id);

  // Params iniciales tomados de la URL (dispersos: solo overrides + `layout`).
  function initialParams(): Record<string, string> {
    const url = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const p of widget?.params ?? []) {
      const raw = url.get(p.name);
      if (raw != null && raw !== '' && raw !== String(p.default)) out[p.name] = raw;
    }
    const layout = url.get('layout');
    if (layout) out.layout = layout;
    return out;
  }

  let params = $state<Record<string, string>>(initialParams());

  const obsUrl = $derived.by(() => {
    const usp = new URLSearchParams({ widget: id });
    for (const [k, v] of Object.entries(params)) usp.set(k, v);
    return `${window.location.origin}/?${usp.toString()}`;
  });
  // Link de prueba: mismo widget pero con datos de demo (para verlo/posicionarlo
  // en OBS sin estar en vivo).
  const testUrl = $derived(`${obsUrl}&preview=1`);
</script>

{#if !widget}
  <div class="missing">
    <p>No existe un widget con id <code>{id}</code>.</p>
    <a href="/">← Volver</a>
  </div>
{:else}
  <main class="panel">
    <header>
      <a class="back" href="/">← Widgets</a>
      <h1>Personalizar: {widget.name}</h1>
      <p>{widget.description}</p>
    </header>

    <WidgetConfig widgetId={id} {params} onChange={(p) => (params = p)} />

    <div class="links-wrap">
      <UrlLinks prodUrl={obsUrl} {testUrl} />
    </div>
  </main>
{/if}

<style>
  .panel {
    height: 100vh;
    overflow-y: auto;
    padding: 2rem 1.5rem 3rem;
    background: radial-gradient(circle at top, #1c2029, #0d0f14);
    color: #f5f7fa;
  }

  .missing {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #14161c;
    color: #fff;
  }

  header {
    max-width: 1000px;
    margin: 0 auto 1.5rem;
  }

  .back {
    color: #53fc18;
    text-decoration: none;
    font-size: 0.9rem;
  }

  h1 {
    margin: 0.5rem 0 0.25rem;
    font-size: 1.6rem;
  }

  header p {
    margin: 0;
    color: #aeb6c2;
  }

  /* WidgetConfig ya trae su propia grilla; solo acotamos el ancho. */
  main :global(.wc-layout) {
    max-width: 1000px;
    margin: 0 auto;
  }

  .links-wrap {
    max-width: 1000px;
    margin: 1.25rem auto 0;
  }
</style>
