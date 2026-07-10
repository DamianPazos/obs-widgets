<script lang="ts">
  import { getWidget, widgets } from '../lib/registry';
  import { obs } from '../lib/desktop';
  import WidgetConfig from './WidgetConfig.svelte';
  import UrlLinks from './UrlLinks.svelte';

  const isDesktop = obs() != null;

  let copiedId = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let editParams = $state<Record<string, string>>({});

  const editing = $derived(editingId ? getWidget(editingId) : null);

  // Sin `channel`: el widget sigue el canal configurado en la app/server.
  function widgetUrl(id: string): string {
    return `${window.location.origin}/?widget=${id}`;
  }

  async function copy(id: string): Promise<void> {
    await navigator.clipboard.writeText(widgetUrl(id));
    copiedId = id;
    setTimeout(() => (copiedId = null), 1500);
  }

  function openConfig(id: string): void {
    editingId = id;
    editParams = {};
  }

  function closeConfig(): void {
    editingId = null;
  }

  // Links (producción / prueba) reflejando lo que se configura en el modal.
  const editProdUrl = $derived.by(() => {
    if (!editingId) return '';
    const usp = new URLSearchParams({ widget: editingId });
    for (const [k, v] of Object.entries(editParams)) usp.set(k, v);
    return `${window.location.origin}/?${usp.toString()}`;
  });
  const editTestUrl = $derived(`${editProdUrl}&preview=1`);
</script>

<main>
  <header>
    <h1>OBS Widgets</h1>
    <p>
      Copiá la URL de un widget y agregala en OBS como <strong>Fuente → Navegador</strong>
      (recomendado: 1920×1080, fondo transparente). Usá <strong>Personalizar</strong> para editar colores,
      textos y opciones con vista previa y obtener la URL lista.
    </p>
    <p class="scene-cta">
      <a href="?builder">🎬 Constructor de escenas</a> — combiná varios widgets en una sola Browser Source,
      posicionados y dimensionados a gusto.
    </p>
    {#if isDesktop}
      <p class="scene-cta">
        <a href="?connect">🔌 Conexión y configuración</a> — elegí la fuente de eventos y activá el nombre
        real de seguidores (modo oficial).
      </p>
    {/if}
  </header>

  <ul class="grid">
    {#each widgets as widget (widget.id)}
      <li class="card">
        <div class="card-head">
          <h2>{widget.name}</h2>
          <span class="badge" class:realtime={widget.mode === 'realtime'}>
            {widget.mode === 'realtime' ? 'tiempo real' : 'offline'}
          </span>
        </div>
        <p class="desc">{widget.description}</p>

        {#if widget.params && widget.params.length > 0}
          <details>
            <summary>Parámetros ({widget.params.length})</summary>
            <ul class="params">
              {#each widget.params as param (param.name)}
                <li>
                  <code>{param.name}</code> — {param.label}
                  <em>(default: {param.default})</em>
                </li>
              {/each}
            </ul>
          </details>
        {/if}

        <div class="url">
          <input readonly value={widgetUrl(widget.id)} />
          <button onclick={() => copy(widget.id)}>
            {copiedId === widget.id ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
        <div class="actions">
          <button class="configure" onclick={() => openConfig(widget.id)}>⚙ Personalizar</button>
          <a
            class="preview"
            href={`${widgetUrl(widget.id)}&preview=1`}
            target="_blank"
            rel="noreferrer"
          >
            Previsualizar ↗
          </a>
        </div>
      </li>
    {/each}
  </ul>
</main>

{#if editing}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={closeConfig}>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <h2>Personalizar: {editing.name}</h2>
        <button class="close" title="Cerrar" onclick={closeConfig}>✕</button>
      </div>
      <div class="modal-body">
        {#key editing.id}
          <WidgetConfig
            widgetId={editing.id}
            params={editParams}
            onChange={(p) => (editParams = p)}
          />
        {/key}
        <div class="modal-links">
          <UrlLinks prodUrl={editProdUrl} testUrl={editTestUrl} />
        </div>
      </div>
      <div class="modal-foot">
        <p class="hint">Copiá el link que quieras y pegalo en OBS como Browser Source.</p>
        <button class="primary" onclick={closeConfig}>Listo</button>
      </div>
    </div>
  </div>
{/if}

<style>
  main {
    height: 100vh;
    padding: 3rem 1.5rem;
    background: radial-gradient(circle at top, #1c2029, #0d0f14);
    color: #f5f7fa;
    overflow-y: auto;
  }

  header {
    max-width: 920px;
    margin: 0 auto 2rem;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }

  header p {
    margin: 0;
    color: #aeb6c2;
    line-height: 1.5;
  }

  .scene-cta {
    margin-top: 0.75rem;
  }

  .scene-cta a {
    color: #53fc18;
    font-weight: 600;
    text-decoration: none;
  }

  .scene-cta a:hover {
    text-decoration: underline;
  }

  .grid {
    list-style: none;
    padding: 0;
    margin: 0 auto;
    max-width: 920px;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .card {
    background: #171a21;
    border: 1px solid #262b36;
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    background: #2a2f3a;
    color: #aeb6c2;
  }

  .badge.realtime {
    background: rgba(83, 252, 24, 0.15);
    color: #53fc18;
  }

  .desc {
    margin: 0;
    color: #aeb6c2;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  details {
    font-size: 0.85rem;
    color: #aeb6c2;
  }

  .params {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  code {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    font-size: 0.85em;
  }

  .url {
    display: flex;
    gap: 0.4rem;
  }

  .url input {
    flex: 1;
    min-width: 0;
    background: #0d0f14;
    border: 1px solid #2a2f3a;
    color: #dfe4ea;
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font-size: 0.8rem;
  }

  .url button {
    background: #53fc18;
    color: #06210a;
    border: none;
    border-radius: 8px;
    padding: 0.45rem 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    gap: 0.9rem;
    align-items: center;
  }

  .configure {
    color: #06210a;
    background: #53fc18;
    border: none;
    font-family: inherit;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .configure:hover {
    filter: brightness(1.05);
  }

  .preview {
    color: #53fc18;
    font-size: 0.85rem;
    text-decoration: none;
  }

  .preview:hover {
    text-decoration: underline;
  }

  /* --- Modal de personalización --- */
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
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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
    font-size: 0.78rem;
    color: #8b94a3;
  }

  .modal .primary {
    background: #53fc18;
    color: #06210a;
    border: none;
    border-radius: 8px;
    padding: 0.45rem 0.9rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
</style>
