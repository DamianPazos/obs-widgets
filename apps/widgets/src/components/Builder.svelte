<script lang="ts">
  import { getWidget, widgets } from '../lib/registry';
  import { clamp } from '../lib/layout';
  import WidgetConfig from './WidgetConfig.svelte';
  import {
    CANVAS_PRESETS,
    decodeScene,
    DEFAULT_CANVAS,
    encodeScene,
    instanceUrl,
    newInstanceId,
    type Scene,
    type SceneInstance,
  } from '../lib/scene';

  const STORAGE_KEY = 'obs-scene';
  const DEFAULT_RECT = { x: 35, y: 38, w: 30, h: 22 };

  function initScene(): Scene {
    const fromUrl = new URLSearchParams(window.location.search).get('scene');
    if (fromUrl) return decodeScene(fromUrl);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return decodeScene(saved);
    return { instances: [] };
  }

  const initial = initScene();
  let instances = $state<SceneInstance[]>(initial.instances);
  let canvas = $state<{ w: number; h: number }>(initial.canvas ?? { ...DEFAULT_CANVAS });
  let selectedId = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let addChoice = $state<string>(widgets[0]?.id ?? '');
  let importUrl = $state('');
  let copied = $state(false);
  let canvasEl: HTMLElement;

  const sceneUrl = $derived(
    `${window.location.origin}/?scene=${encodeScene({ instances, canvas })}`,
  );
  const selected = $derived(instances.find((i) => i.id === selectedId) ?? null);
  const editing = $derived(instances.find((i) => i.id === editingId) ?? null);

  function updateParams(id: string, params: Record<string, string>): void {
    instances = instances.map((i) => (i.id === id ? { ...i, params } : i));
  }

  // Persistimos la escena en localStorage mientras se edita.
  $effect(() => {
    localStorage.setItem(STORAGE_KEY, encodeScene({ instances, canvas }));
  });

  function applyPreset(value: string): void {
    const [w, h] = value.split('x').map(Number);
    if (Number.isFinite(w) && Number.isFinite(h) && w && h) canvas = { w, h };
  }

  const presetValue = $derived(
    CANVAS_PRESETS.some((p) => p.w === canvas.w && p.h === canvas.h)
      ? `${canvas.w}x${canvas.h}`
      : 'custom',
  );

  function widgetName(widgetId: string): string {
    return getWidget(widgetId)?.name ?? widgetId;
  }

  function addWidget(): void {
    const w = getWidget(addChoice);
    if (!w) return;
    const id = newInstanceId();
    instances = [...instances, { id, widget: w.id, params: {}, rect: { ...DEFAULT_RECT } }];
    selectedId = id;
  }

  function addFromUrl(): void {
    if (!importUrl.trim()) return;
    try {
      const url = new URL(importUrl.trim(), window.location.origin);
      const usp = new URLSearchParams(url.search);
      const widgetId = usp.get('widget');
      if (!widgetId || !getWidget(widgetId)) return;
      const params: Record<string, string> = {};
      const skip = new Set([
        'widget',
        'edit',
        'preview',
        'grid',
        'snap',
        'fit',
        'scene',
        'builder',
      ]);
      for (const [k, v] of usp) if (!skip.has(k)) params[k] = v;
      const id = newInstanceId();
      instances = [...instances, { id, widget: widgetId, params, rect: { ...DEFAULT_RECT } }];
      selectedId = id;
      importUrl = '';
    } catch {
      /* URL inválida */
    }
  }

  function remove(id: string): void {
    instances = instances.filter((i) => i.id !== id);
    if (selectedId === id) selectedId = null;
    if (editingId === id) editingId = null;
  }

  function clearScene(): void {
    instances = [];
    selectedId = null;
    editingId = null;
  }

  async function copyScene(): Promise<void> {
    await navigator.clipboard.writeText(sceneUrl);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function startMove(inst: SceneInstance, event: PointerEvent): void {
    event.preventDefault();
    selectedId = inst.id;
    const rect = canvasEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const orig = { ...inst.rect };

    const onMove = (ev: PointerEvent): void => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      inst.rect.x = clamp(orig.x + dx, 0, 100 - inst.rect.w);
      inst.rect.y = clamp(orig.y + dy, 0, 100 - inst.rect.h);
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(inst: SceneInstance, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    selectedId = inst.id;
    const rect = canvasEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const orig = { ...inst.rect };

    const onMove = (ev: PointerEvent): void => {
      const dw = ((ev.clientX - startX) / rect.width) * 100;
      const dh = ((ev.clientY - startY) / rect.height) * 100;
      inst.rect.w = clamp(orig.w + dw, 5, 100 - inst.rect.x);
      inst.rect.h = clamp(orig.h + dh, 5, 100 - inst.rect.y);
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
</script>

<main class="builder">
  <header>
    <a class="back" href="/">← Widgets</a>
    <h1>Constructor de escenas</h1>
    <p>Componé varios widgets en un lienzo 16:9 y cargalos en OBS con una sola Browser Source.</p>
  </header>

  <div class="layout">
    <aside class="side">
      <section class="card">
        <h3>Tamaño del lienzo</h3>
        <div class="add-row">
          <select value={presetValue} onchange={(e) => applyPreset(e.currentTarget.value)}>
            {#each CANVAS_PRESETS as p (p.label)}
              <option value="{p.w}x{p.h}">{p.label}</option>
            {/each}
            <option value="custom">Personalizado</option>
          </select>
        </div>
        <div class="add-row size-row">
          <input type="number" min="200" step="10" bind:value={canvas.w} />
          <span>×</span>
          <input type="number" min="200" step="10" bind:value={canvas.h} />
        </div>
        <p class="hint">En OBS poné la Browser Source de {canvas.w}×{canvas.h}.</p>
      </section>

      <section class="card">
        <h3>Agregar widget</h3>
        <div class="add-row">
          <select bind:value={addChoice}>
            {#each widgets as w (w.id)}
              <option value={w.id}>{w.name}</option>
            {/each}
          </select>
          <button class="primary" onclick={addWidget}>Agregar</button>
        </div>
        <p class="hint">O pegá la URL de un widget ya personalizado:</p>
        <div class="add-row">
          <input type="text" placeholder="http://localhost:5173/?widget=…" bind:value={importUrl} />
          <button onclick={addFromUrl}>Traer</button>
        </div>
      </section>

      <section class="card">
        <h3>En la escena ({instances.length})</h3>
        {#if instances.length === 0}
          <p class="hint">Todavía no agregaste widgets.</p>
        {:else}
          <ul class="list">
            {#each instances as inst (inst.id)}
              <li class:active={selectedId === inst.id}>
                <button class="pick" onclick={() => (selectedId = inst.id)}>
                  {widgetName(inst.widget)}
                </button>
                <button class="del" title="Quitar" onclick={() => remove(inst.id)}>✕</button>
              </li>
            {/each}
          </ul>
          <button class="ghost" onclick={clearScene}>Vaciar escena</button>
        {/if}
      </section>

      {#if selected}
        <section class="card">
          <h3>{widgetName(selected.widget)}</h3>
          <p class="hint">
            Arrastralo en el lienzo para moverlo y usá el tirador de la esquina para
            redimensionarlo.
          </p>
          <p class="coords">
            x {Math.round(selected.rect.x)}% · y {Math.round(selected.rect.y)}% · {Math.round(
              selected.rect.w,
            )}×{Math.round(selected.rect.h)}%
          </p>
          <button class="primary full" onclick={() => (editingId = selected!.id)}>
            ⚙ Personalizar este widget
          </button>
        </section>
      {/if}
    </aside>

    <section class="stage-pane">
      <div class="stage-frame">
        <div class="stage" bind:this={canvasEl} style="aspect-ratio: {canvas.w} / {canvas.h};">
          {#each instances as inst (inst.id)}
            <div
              class="inst-box"
              class:selected={selectedId === inst.id}
              style="left: {inst.rect.x}%; top: {inst.rect.y}%; width: {inst.rect.w}%; height: {inst
                .rect.h}%;"
            >
              <iframe
                class="inst-frame"
                title={inst.widget}
                src={instanceUrl(inst, { fit: '1', preview: '1' })}
              ></iframe>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="inst-overlay" onpointerdown={(e) => startMove(inst, e)}></div>
              {#if selectedId === inst.id}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="handle br" onpointerdown={(e) => startResize(inst, e)}></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="url">
        <input readonly value={sceneUrl} />
        <button class="primary" onclick={copyScene}
          >{copied ? '¡Copiado!' : 'Copiar para OBS'}</button
        >
      </div>
    </section>
  </div>
</main>

{#if editing}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={() => (editingId = null)}>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <h2>Personalizar: {widgetName(editing.widget)}</h2>
        <button class="close" title="Cerrar" onclick={() => (editingId = null)}>✕</button>
      </div>
      <div class="modal-body">
        {#key editing.id}
          <WidgetConfig
            widgetId={editing.widget}
            params={editing.params}
            onChange={(p) => updateParams(editing!.id, p)}
          />
        {/key}
      </div>
      <div class="modal-foot">
        <p class="hint">Los cambios se aplican al instante en la escena.</p>
        <button class="primary" onclick={() => (editingId = null)}>Listo</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .builder {
    height: 100vh;
    overflow-y: auto;
    padding: 2rem 1.5rem 3rem;
    background: radial-gradient(circle at top, #1c2029, #0d0f14);
    color: #f5f7fa;
  }

  .size-row span {
    align-self: center;
    color: #8b94a3;
  }

  header {
    max-width: 1200px;
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
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 820px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card {
    background: #171a21;
    border: 1px solid #262b36;
    border-radius: 12px;
    padding: 1rem 1.1rem;
  }

  .card h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }

  .hint {
    margin: 0.5rem 0;
    font-size: 0.78rem;
    color: #8b94a3;
  }

  .add-row {
    display: flex;
    gap: 0.4rem;
  }

  .add-row select,
  .add-row input {
    flex: 1;
    min-width: 0;
    background: #0d0f14;
    border: 1px solid #2a2f3a;
    color: #dfe4ea;
    border-radius: 8px;
    padding: 0.45rem 0.5rem;
    font-size: 0.85rem;
  }

  button {
    border: 1px solid #2a2f3a;
    background: #1d222b;
    color: #dfe4ea;
    border-radius: 8px;
    padding: 0.45rem 0.7rem;
    cursor: pointer;
    font-size: 0.85rem;
  }

  button.primary {
    background: #53fc18;
    color: #06210a;
    border: none;
    font-weight: 600;
  }

  button.ghost {
    background: transparent;
    color: #aeb6c2;
    margin-top: 0.6rem;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .list li {
    display: flex;
    gap: 0.3rem;
  }

  .list .pick {
    flex: 1;
    text-align: left;
    background: #0d0f14;
  }

  .list li.active .pick {
    border-color: #53fc18;
    color: #fff;
  }

  .list .del {
    background: transparent;
    color: #ff6b6b;
    border-color: transparent;
  }

  .coords {
    margin: 0.3rem 0;
    font-size: 0.8rem;
    color: #53fc18;
    font-variant-numeric: tabular-nums;
  }

  .stage-pane {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .stage-frame {
    display: flex;
    justify-content: center;
  }

  .stage {
    position: relative;
    height: 68vh;
    max-width: 100%;
    border-radius: 12px;
    border: 1px solid #262b36;
    overflow: hidden;
    background-color: #101216;
    background-image:
      linear-gradient(45deg, #171a21 25%, transparent 25%),
      linear-gradient(-45deg, #171a21 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #171a21 75%),
      linear-gradient(-45deg, transparent 75%, #171a21 75%);
    background-size: 40px 40px;
    background-position:
      0 0,
      0 20px,
      20px -20px,
      -20px 0;
  }

  .inst-box {
    position: absolute;
    outline: 1px dashed rgba(255, 255, 255, 0.22);
  }

  .inst-frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    background: transparent;
    pointer-events: none;
  }

  .inst-overlay {
    position: absolute;
    inset: 0;
    cursor: move;
    touch-action: none;
  }

  .inst-box.selected {
    outline: 2px solid #53fc18;
    outline-offset: 0;
  }

  .handle {
    position: absolute;
    width: 14px;
    height: 14px;
    background: #53fc18;
    border: 2px solid #0d0f14;
    border-radius: 3px;
    touch-action: none;
  }

  .handle.br {
    right: -7px;
    bottom: -7px;
    cursor: nwse-resize;
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

  button.primary.full {
    width: 100%;
    margin-top: 0.6rem;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(6, 8, 12, 0.72);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 3vh 1.5rem;
    overflow-y: auto;
  }

  .modal {
    width: min(1000px, 100%);
    background: #12151b;
    border: 1px solid #262b36;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #262b36;
  }

  .modal-head h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .close {
    background: transparent;
    border: 1px solid #2a2f3a;
    color: #aeb6c2;
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .modal-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #262b36;
  }

  .modal-foot .hint {
    margin: 0;
  }
</style>
