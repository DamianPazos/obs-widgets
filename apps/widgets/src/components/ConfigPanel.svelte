<script lang="ts">
  import { getWidget } from '../lib/registry';
  import WidgetConfig from './WidgetConfig.svelte';

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
  let copied = $state<'prod' | 'test' | null>(null);

  const obsUrl = $derived.by(() => {
    const usp = new URLSearchParams({ widget: id });
    for (const [k, v] of Object.entries(params)) usp.set(k, v);
    return `${window.location.origin}/?${usp.toString()}`;
  });
  // Link de prueba: mismo widget pero con datos de demo (para verlo/posicionarlo
  // en OBS sin estar en vivo).
  const testUrl = $derived(`${obsUrl}&preview=1`);

  async function copy(kind: 'prod' | 'test'): Promise<void> {
    await navigator.clipboard.writeText(kind === 'prod' ? obsUrl : testUrl);
    copied = kind;
    setTimeout(() => (copied = null), 1500);
  }
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

    <div class="urls">
      <div class="url-row">
        <div class="url-label">
          <strong>🟢 Producción</strong>
          <span>Datos reales. Se muestra cuando estás <b>en vivo</b> en Kick.</span>
        </div>
        <div class="url">
          <input readonly value={obsUrl} />
          <button onclick={() => copy('prod')}>{copied === 'prod' ? '¡Copiado!' : 'Copiar'}</button>
        </div>
      </div>

      <div class="url-row">
        <div class="url-label">
          <strong>🧪 Prueba</strong>
          <span>Datos de demo. Para verlo y <b>posicionarlo</b> en OBS sin estar en vivo.</span>
        </div>
        <div class="url">
          <input readonly value={testUrl} />
          <button onclick={() => copy('test')}>{copied === 'test' ? '¡Copiado!' : 'Copiar'}</button>
        </div>
      </div>
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

  .urls {
    max-width: 1000px;
    margin: 1.25rem auto 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .url-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .url-label {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .url-label strong {
    font-size: 0.9rem;
  }

  .url-label span {
    font-size: 0.78rem;
    color: #8b94a3;
  }

  .url {
    display: flex;
    gap: 0.5rem;
  }

  .url input {
    flex: 1;
    min-width: 0;
    background: #0d0f14;
    border: 1px solid #2a2f3a;
    color: #dfe4ea;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
  }

  .url button {
    background: #53fc18;
    color: #06210a;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
</style>
