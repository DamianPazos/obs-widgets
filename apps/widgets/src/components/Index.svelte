<script lang="ts">
  import { widgets } from '../lib/registry';

  let copiedId = $state<string | null>(null);

  function widgetUrl(id: string, mode: string): string {
    const base = `${window.location.origin}/?widget=${id}`;
    return mode === 'realtime' ? `${base}&channel=demo` : base;
  }

  async function copy(id: string, mode: string): Promise<void> {
    await navigator.clipboard.writeText(widgetUrl(id, mode));
    copiedId = id;
    setTimeout(() => (copiedId = null), 1500);
  }
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
          <input readonly value={widgetUrl(widget.id, widget.mode)} />
          <button onclick={() => copy(widget.id, widget.mode)}>
            {copiedId === widget.id ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
        <div class="actions">
          <a class="configure" href={`?config=${widget.id}`}>⚙ Personalizar</a>
          <a
            class="preview"
            href={widgetUrl(widget.id, widget.mode)}
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
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
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
</style>
