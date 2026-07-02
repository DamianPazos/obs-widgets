<script lang="ts">
  import { getWidget } from '../lib/registry';
  import type { WidgetParam } from '../lib/manifest';

  const id = new URLSearchParams(window.location.search).get('config') ?? '';
  const widget = getWidget(id);
  const params: WidgetParam[] = widget?.params ?? [];

  function initValues(): Record<string, string> {
    const url = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const p of params) {
      const raw = url.get(p.name);
      out[p.name] = raw ?? String(p.default);
    }
    return out;
  }

  let values = $state<Record<string, string>>(initValues());
  let bg = $state<'oscuro' | 'claro' | 'damero'>('oscuro');
  let copied = $state(false);

  function buildUrl(preview: boolean): string {
    const usp = new URLSearchParams({ widget: id });
    for (const p of params) {
      const v = values[p.name];
      // Omitimos vacíos y los que quedaron en su valor por defecto (URL limpia).
      if (v == null || v === '' || v === String(p.default)) continue;
      usp.set(p.name, v);
    }
    if (preview && widget?.mode === 'realtime') usp.set('preview', '1');
    return `${window.location.origin}/?${usp.toString()}`;
  }

  const obsUrl = $derived.by(() => buildUrl(false));
  const previewUrl = $derived.by(() => buildUrl(true));

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(obsUrl);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function reset(): void {
    values = initValues();
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

    <div class="layout">
      <form onsubmit={(e) => e.preventDefault()}>
        {#each params as param (param.name)}
          <label class="field">
            <span class="label">{param.label}</span>
            {#if param.description}<span class="hint">{param.description}</span>{/if}

            {#if param.type === 'color'}
              <span class="color-row">
                <input
                  type="color"
                  value={`#${values[param.name]}`}
                  oninput={(e) => (values[param.name] = e.currentTarget.value.replace('#', ''))}
                />
                <input
                  class="hex"
                  type="text"
                  value={values[param.name]}
                  oninput={(e) => (values[param.name] = e.currentTarget.value.replace('#', ''))}
                />
              </span>
            {:else if param.type === 'range'}
              <span class="range-row">
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={values[param.name]}
                  oninput={(e) => (values[param.name] = e.currentTarget.value)}
                />
                <span class="range-val">{values[param.name]}</span>
              </span>
            {:else if param.type === 'number'}
              <input
                type="number"
                min={param.min}
                max={param.max}
                step={param.step}
                value={values[param.name]}
                oninput={(e) => (values[param.name] = e.currentTarget.value)}
              />
            {:else if param.type === 'boolean'}
              <input
                type="checkbox"
                checked={values[param.name] === 'true'}
                onchange={(e) => (values[param.name] = e.currentTarget.checked ? 'true' : 'false')}
              />
            {:else if param.type === 'select'}
              <select
                value={values[param.name]}
                onchange={(e) => (values[param.name] = e.currentTarget.value)}
              >
                {#each param.options ?? [] as opt (opt.value)}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            {:else if param.type === 'image'}
              <input
                type="text"
                placeholder="https://…"
                value={values[param.name]}
                oninput={(e) => (values[param.name] = e.currentTarget.value)}
              />
            {:else}
              <input
                type="text"
                value={values[param.name]}
                oninput={(e) => (values[param.name] = e.currentTarget.value)}
              />
            {/if}
          </label>
        {/each}

        <button type="button" class="reset" onclick={reset}>Restablecer</button>
      </form>

      <section class="preview-pane">
        <div class="toolbar">
          <span>Vista previa</span>
          <div class="bg-toggle">
            <button class:active={bg === 'oscuro'} onclick={() => (bg = 'oscuro')}>Oscuro</button>
            <button class:active={bg === 'claro'} onclick={() => (bg = 'claro')}>Claro</button>
            <button class:active={bg === 'damero'} onclick={() => (bg = 'damero')}>Damero</button>
          </div>
        </div>

        <div class="preview {bg}">
          <iframe title="Vista previa del widget" src={previewUrl}></iframe>
        </div>

        {#if widget.mode === 'realtime'}
          <p class="note">
            La vista previa usa datos de ejemplo en loop. En vivo, la alerta salta con cada evento
            real.
          </p>
        {/if}

        <div class="url">
          <input readonly value={obsUrl} />
          <button onclick={copy}>{copied ? '¡Copiado!' : 'Copiar para OBS'}</button>
        </div>
      </section>
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

  .layout {
    max-width: 1000px;
    margin: 0 auto;
    display: grid;
    gap: 1.5rem;
    grid-template-columns: 340px 1fr;
    align-items: start;
  }

  @media (max-width: 760px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #171a21;
    border: 1px solid #262b36;
    border-radius: 12px;
    padding: 1.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field .label {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .field .hint {
    font-size: 0.75rem;
    color: #8b94a3;
  }

  input[type='text'],
  input[type='number'],
  select {
    background: #0d0f14;
    border: 1px solid #2a2f3a;
    color: #dfe4ea;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.9rem;
  }

  input[type='checkbox'] {
    width: 1.15rem;
    height: 1.15rem;
    align-self: flex-start;
  }

  .color-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .color-row input[type='color'] {
    width: 44px;
    height: 38px;
    padding: 0;
    border: 1px solid #2a2f3a;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }

  .color-row .hex {
    flex: 1;
    min-width: 0;
  }

  .range-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .range-row input[type='range'] {
    flex: 1;
    accent-color: #53fc18;
  }

  .range-val {
    min-width: 2.6rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #aeb6c2;
    font-size: 0.85rem;
  }

  .reset {
    align-self: flex-start;
    background: transparent;
    color: #aeb6c2;
    border: 1px solid #2a2f3a;
    border-radius: 8px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
  }

  .preview-pane {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #aeb6c2;
    font-size: 0.85rem;
  }

  .bg-toggle {
    display: flex;
    gap: 0.25rem;
  }

  .bg-toggle button {
    background: #171a21;
    border: 1px solid #2a2f3a;
    color: #aeb6c2;
    border-radius: 6px;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .bg-toggle button.active {
    background: #2a2f3a;
    color: #fff;
  }

  .preview {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #262b36;
  }

  .preview iframe {
    display: block;
    width: 100%;
    height: 420px;
    border: 0;
  }

  .preview.oscuro {
    background: #101216;
  }

  .preview.claro {
    background: #e9edf2;
  }

  .preview.damero {
    background-color: #2a2f3a;
    background-image:
      linear-gradient(45deg, #1c2029 25%, transparent 25%),
      linear-gradient(-45deg, #1c2029 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1c2029 75%),
      linear-gradient(-45deg, transparent 75%, #1c2029 75%);
    background-size: 24px 24px;
    background-position:
      0 0,
      0 12px,
      12px -12px,
      -12px 0;
  }

  .note {
    margin: 0;
    font-size: 0.8rem;
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
