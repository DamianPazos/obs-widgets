<script lang="ts">
  import { getWidget } from '../lib/registry';
  import type { WidgetParam } from '../lib/manifest';
  import {
    decodeLayout,
    encodeLayout,
    PANEL_MSG,
    WIDGET_MSG,
    type Layout,
    type Point,
  } from '../lib/layout';
  import { fileToDataUrl } from '../lib/image';
  import { isImageUrl } from '../lib/style';

  const id = new URLSearchParams(window.location.search).get('config') ?? '';
  const widget = getWidget(id);
  const params: WidgetParam[] = widget?.params ?? [];
  const elements = widget?.elements ?? [];

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

  // Posiciones de los objetos (editor).
  let layoutMap = $state<Layout>(
    decodeLayout(new URLSearchParams(window.location.search).get('layout')),
  );
  let selectedId = $state<string | null>(null);
  let grid = $state(false);
  let snapStep = $state('0');
  let iframeEl: HTMLIFrameElement | undefined = $state();

  const layoutValue = $derived(encodeLayout(layoutMap));
  const selPoint = $derived(
    selectedId ? (layoutMap[selectedId] ?? ({ x: 50, y: 50 } as Point)) : null,
  );

  function elementLabel(elId: string): string {
    return elements.find((e) => e.id === elId)?.label ?? elId;
  }

  function sendToWidget(message: Record<string, unknown>): void {
    iframeEl?.contentWindow?.postMessage({ source: PANEL_MSG, ...message }, window.location.origin);
  }
  function onIframeLoad(): void {
    sendToWidget({ type: 'set-layout', value: encodeLayout(layoutMap) });
    sendToWidget({ type: 'select', id: selectedId });
  }

  // Mensajes que llegan del widget (iframe) en modo edición.
  $effect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        source?: string;
        type?: string;
        value?: string;
        id?: string;
        pos?: Point;
      } | null;
      if (data?.source !== WIDGET_MSG) return;

      if (data.type === 'ready') {
        // El widget (re)cargó y ya escucha: le mandamos el estado actual.
        sendToWidget({ type: 'set-layout', value: encodeLayout(layoutMap) });
        sendToWidget({ type: 'select', id: selectedId });
      } else if (data.type === 'layout' && typeof data.value === 'string') {
        layoutMap = decodeLayout(data.value);
      } else if (data.type === 'select' && typeof data.id === 'string') {
        selectedId = data.id;
        if (data.pos) layoutMap[data.id] = data.pos;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  function buildUrl(preview: boolean): string {
    const usp = new URLSearchParams({ widget: id });
    for (const p of params) {
      const v = values[p.name];
      if (v == null || v === '' || v === String(p.default)) continue;
      usp.set(p.name, v);
    }
    if (preview) {
      if (widget?.mode === 'realtime') usp.set('preview', '1');
      usp.set('edit', '1');
      if (grid) usp.set('grid', '1');
      if (snapStep !== '0') usp.set('snap', snapStep);
    } else if (layoutValue) {
      usp.set('layout', layoutValue);
    }
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

  function resetLayout(): void {
    layoutMap = {};
    selectedId = null;
    sendToWidget({ type: 'reset-layout' });
    sendToWidget({ type: 'select', id: null });
  }

  function deselect(): void {
    selectedId = null;
    sendToWidget({ type: 'select', id: null });
  }

  function updateSelected(patch: Partial<Point>): void {
    if (!selectedId) return;
    const cur = layoutMap[selectedId] ?? { x: 50, y: 50 };
    layoutMap[selectedId] = { ...cur, ...patch };
    sendToWidget({ type: 'set-layout', value: encodeLayout(layoutMap) });
  }

  async function pickImage(param: WidgetParam, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    const maxDim = param.type === 'image' ? 900 : 320; // fondo vs. ícono/logo
    try {
      values[param.name] = await fileToDataUrl(file, maxDim);
    } catch {
      /* archivo inválido: se ignora */
    }
    input.value = ''; // permite volver a elegir el mismo archivo
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
      {#if selectedId}
        <div class="card contextual">
          <button type="button" class="back-link" onclick={deselect}>← Estilos generales</button>
          <h3>{elementLabel(selectedId)}</h3>
          <p class="hint">Posición y tamaño de este objeto (o arrastralo en la vista previa).</p>

          <label class="field">
            <span class="label">Posición X <b>{Math.round(selPoint?.x ?? 50)}%</b></span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={selPoint?.x ?? 50}
              oninput={(e) => updateSelected({ x: Number(e.currentTarget.value) })}
            />
          </label>
          <label class="field">
            <span class="label">Posición Y <b>{Math.round(selPoint?.y ?? 50)}%</b></span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={selPoint?.y ?? 50}
              oninput={(e) => updateSelected({ y: Number(e.currentTarget.value) })}
            />
          </label>
          <label class="field">
            <span class="label">Tamaño <b>{(selPoint?.s ?? 1).toFixed(1)}×</b></span>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.1"
              value={selPoint?.s ?? 1}
              oninput={(e) => updateSelected({ s: Number(e.currentTarget.value) })}
            />
          </label>
        </div>
      {:else}
        <form class="card" onsubmit={(e) => e.preventDefault()}>
          {#each params as param (param.name)}
            <div class="field">
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
                  onchange={(e) =>
                    (values[param.name] = e.currentTarget.checked ? 'true' : 'false')}
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
                <div class="image-field">
                  {#if values[param.name]}
                    <img class="thumb" src={values[param.name]} alt="vista previa" />
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    onchange={(e) => pickImage(param, e.currentTarget)}
                  />
                  {#if values[param.name]}
                    <button
                      type="button"
                      class="clear-img"
                      onclick={() => (values[param.name] = '')}
                    >
                      Quitar imagen
                    </button>
                  {/if}
                </div>
              {:else if param.withUpload}
                <div class="image-field">
                  {#if isImageUrl(values[param.name] ?? '')}
                    <img class="thumb" src={values[param.name]} alt="vista previa" />
                    <div class="upload-row">
                      <label class="upload-btn">
                        Cambiar imagen
                        <input
                          type="file"
                          accept="image/*"
                          onchange={(e) => pickImage(param, e.currentTarget)}
                        />
                      </label>
                      <button
                        type="button"
                        class="clear-img"
                        onclick={() => (values[param.name] = String(param.default))}
                      >
                        Volver a emoji
                      </button>
                    </div>
                  {:else}
                    <div class="upload-row">
                      <input
                        type="text"
                        value={values[param.name]}
                        oninput={(e) => (values[param.name] = e.currentTarget.value)}
                      />
                      <label class="upload-btn">
                        📁 Subir imagen
                        <input
                          type="file"
                          accept="image/*"
                          onchange={(e) => pickImage(param, e.currentTarget)}
                        />
                      </label>
                    </div>
                  {/if}
                </div>
              {:else}
                <input
                  type="text"
                  value={values[param.name]}
                  oninput={(e) => (values[param.name] = e.currentTarget.value)}
                />
              {/if}
            </div>
          {/each}

          <button type="button" class="reset" onclick={reset}>Restablecer estilos</button>
        </form>
      {/if}

      <section class="preview-pane">
        <div class="toolbar">
          <span>Editor</span>
          <div class="tools">
            <label class="chk">
              <input
                type="checkbox"
                checked={grid}
                onchange={(e) => (grid = e.currentTarget.checked)}
              />
              Cuadrícula
            </label>
            <select value={snapStep} onchange={(e) => (snapStep = e.currentTarget.value)}>
              <option value="0">Sin imán</option>
              <option value="2.5">Imán fino</option>
              <option value="5">Imán medio</option>
              <option value="10">Imán grueso</option>
            </select>
            <div class="bg-toggle">
              <button class:active={bg === 'oscuro'} onclick={() => (bg = 'oscuro')}>Oscuro</button>
              <button class:active={bg === 'claro'} onclick={() => (bg = 'claro')}>Claro</button>
              <button class:active={bg === 'damero'} onclick={() => (bg = 'damero')}>Damero</button>
            </div>
          </div>
        </div>

        <div class="preview {bg}">
          <iframe
            title="Vista previa del widget"
            src={previewUrl}
            bind:this={iframeEl}
            onload={onIframeLoad}
          ></iframe>
        </div>

        <div class="editor-hint">
          <span>👆 Clickeá un objeto para configurarlo · arrastralo para moverlo.</span>
          <button type="button" onclick={resetLayout}>Restablecer posiciones</button>
        </div>

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

  .card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #171a21;
    border: 1px solid #262b36;
    border-radius: 12px;
    padding: 1.25rem;
  }

  .contextual h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .back-link {
    align-self: flex-start;
    background: transparent;
    border: none;
    color: #53fc18;
    cursor: pointer;
    padding: 0;
    font-size: 0.85rem;
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

  .field .label b {
    color: #53fc18;
    font-weight: 600;
  }

  .field .hint,
  .hint {
    font-size: 0.75rem;
    color: #8b94a3;
    margin: 0;
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

  input[type='range'] {
    accent-color: #53fc18;
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
  }

  .range-val {
    min-width: 2.6rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #aeb6c2;
    font-size: 0.85rem;
  }

  .image-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .image-field input[type='file'] {
    font-size: 0.8rem;
    color: #aeb6c2;
    max-width: 100%;
  }

  .thumb {
    max-width: 100%;
    max-height: 90px;
    border-radius: 8px;
    border: 1px solid #2a2f3a;
    object-fit: contain;
    background-color: #14161c;
    background-image:
      linear-gradient(45deg, #23272f 25%, transparent 25%),
      linear-gradient(-45deg, #23272f 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #23272f 75%),
      linear-gradient(-45deg, transparent 75%, #23272f 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
  }

  .clear-img {
    background: transparent;
    color: #aeb6c2;
    border: 1px solid #2a2f3a;
    border-radius: 8px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .upload-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .upload-row input[type='text'] {
    flex: 1;
    min-width: 4rem;
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #171a21;
    color: #dfe4ea;
    border: 1px solid #2a2f3a;
    border-radius: 8px;
    padding: 0.45rem 0.7rem;
    cursor: pointer;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .upload-btn input[type='file'] {
    display: none;
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
    gap: 0.75rem;
    flex-wrap: wrap;
    color: #aeb6c2;
    font-size: 0.85rem;
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .chk {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }

  .chk input {
    width: 1rem;
    height: 1rem;
    align-self: auto;
  }

  .tools select {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
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
    height: 440px;
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

  .editor-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #aeb6c2;
  }

  .editor-hint button {
    background: #171a21;
    border: 1px solid #2a2f3a;
    color: #aeb6c2;
    border-radius: 8px;
    padding: 0.35rem 0.7rem;
    cursor: pointer;
    white-space: nowrap;
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
