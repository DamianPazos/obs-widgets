<script lang="ts">
  import { onMount } from 'svelte';
  import {
    obs,
    type DesktopSettings,
    type DesktopStatus,
    type WebhookTestResult,
  } from '../lib/desktop';

  const bridge = obs();

  let settings = $state<DesktopSettings | null>(null);
  let status = $state<DesktopStatus | null>(null);
  let saving = $state(false);
  let testing = $state(false);
  let testResult = $state<WebhookTestResult | null>(null);
  let copied = $state(false);

  // URL de webhook esperada según el dominio (visible aun antes de levantar el túnel).
  const webhookUrl = $derived(
    settings?.ngrokDomain ? `https://${settings.ngrokDomain}/webhooks/kick` : null,
  );

  async function refresh(): Promise<void> {
    if (!bridge) return;
    try {
      status = await bridge.getStatus();
    } catch {
      /* server reiniciando */
    }
  }

  onMount(() => {
    if (!bridge) return;
    void (async () => {
      settings = await bridge.getSettings();
      await refresh();
    })();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  });

  async function save(): Promise<void> {
    if (!bridge || !settings) return;
    saving = true;
    try {
      await bridge.saveSettings($state.snapshot(settings));
    } finally {
      saving = false;
    }
    // El server reinicia y la ventana recarga sola; refrescamos por las dudas.
    await refresh();
  }

  async function test(): Promise<void> {
    if (!bridge) return;
    testing = true;
    testResult = null;
    try {
      testResult = await bridge.testWebhook();
    } finally {
      testing = false;
    }
  }

  async function copyWebhook(): Promise<void> {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString();
  }
</script>

{#if !bridge}
  <main class="wrap">
    <div class="notice">
      <h1>Conexión</h1>
      <p>
        Esta pantalla es parte de la <strong>app de escritorio</strong>. Abrila desde la app
        (bandeja → “Conexión y configuración”).
      </p>
      <a class="back" href="/">← Volver a los widgets</a>
    </div>
  </main>
{:else if settings}
  <main class="wrap">
    <header>
      <a class="back" href="/">← Widgets</a>
      <h1>Conexión y configuración</h1>
      <p>
        Elegí de dónde vienen los eventos y, si querés nombres reales de seguidores, configurá el
        modo oficial.
      </p>
    </header>

    <!-- Estado en vivo -->
    <section class="card status">
      <h2>Estado</h2>
      <div class="grid">
        <div class="stat">
          <span class="k">Fuente</span>
          <span class="v">{status?.server?.source ?? settings.eventSource}</span>
        </div>
        <div class="stat">
          <span class="k">Canal</span>
          <span class="v">{status?.server?.channel || settings.channel || '—'}</span>
        </div>
        <div class="stat">
          <span class="k">En vivo</span>
          <span class="v">
            <span class="dot" class:on={status?.server?.live}></span>
            {status?.server?.live ? 'sí' : 'no'}
            {#if status?.server?.live && status?.server?.viewers != null}· {status.server.viewers} 👁{/if}
          </span>
        </div>
        <div class="stat">
          <span class="k">Servidor (OBS)</span>
          <span class="v mono">{status?.serverUrl ?? '—'}</span>
        </div>
        {#if settings.eventSource === 'kick'}
          <div class="stat">
            <span class="k">Túnel</span>
            <span class="v">
              <span class="dot" class:on={!!status?.tunnel.url}></span>
              {status?.tunnel.url ? 'activo' : status?.tunnel.error ? 'error' : 'inactivo'}
            </span>
          </div>
        {/if}
        <div class="stat">
          <span class="k">Último evento</span>
          <span class="v">
            {#if status?.server?.lastEvent}
              {status.server.lastEvent.type} · {fmtTime(status.server.lastEvent.at)}
            {:else}—{/if}
          </span>
        </div>
      </div>
      {#if status?.tunnel.error}
        <p class="err">Túnel: {status.tunnel.error}</p>
      {/if}
    </section>

    <!-- Modo -->
    <section class="card">
      <h2>Fuente de eventos</h2>
      <div class="modes">
        <button
          class="mode"
          class:sel={settings.eventSource === 'kick-ws'}
          onclick={() => (settings!.eventSource = 'kick-ws')}
        >
          <strong>Kick simple</strong>
          <span
            >Sin configuración. Follows sin nombre (mensaje genérico). Recomendado para empezar.</span
          >
        </button>
        <button
          class="mode"
          class:sel={settings.eventSource === 'kick'}
          onclick={() => (settings!.eventSource = 'kick')}
        >
          <strong>Kick oficial</strong>
          <span>Follows con <b>nombre real</b> al instante. Requiere setup una vez (abajo).</span>
        </button>
        <button
          class="mode"
          class:sel={settings.eventSource === 'mock'}
          onclick={() => (settings!.eventSource = 'mock')}
        >
          <strong>Demo (mock)</strong>
          <span>Eventos de prueba, sin Kick. Para probar los widgets.</span>
        </button>
      </div>

      <label class="field">
        <span class="label">Canal de Kick</span>
        <input type="text" placeholder="tu_canal" bind:value={settings.channel} />
      </label>
    </section>

    <!-- Setup oficial (wizard) -->
    {#if settings.eventSource === 'kick'}
      <section class="card">
        <h2>Configurar el modo oficial</h2>
        <p class="hint">
          Estos pasos se hacen <strong>una sola vez</strong>. Después, cada sesión es automática.
        </p>

        <ol class="steps">
          <li>
            <div class="step-head"><span class="num">1</span> Creá una app en Kick</div>
            <p>
              En <a href="https://kick.com/settings/developer" target="_blank" rel="noreferrer"
                >kick.com/settings/developer</a
              > creá una app y copiá sus credenciales.
            </p>
            <label class="field"
              ><span class="label">Client ID</span>
              <input type="text" bind:value={settings.clientId} /></label
            >
            <label class="field"
              ><span class="label">Client Secret</span>
              <input type="password" bind:value={settings.clientSecret} /></label
            >
          </li>

          <li>
            <div class="step-head"><span class="num">2</span> Cuenta de ngrok (túnel)</div>
            <p>
              Creá una cuenta gratis en <a
                href="https://dashboard.ngrok.com/signup"
                target="_blank"
                rel="noreferrer">ngrok</a
              >, copiá tu
              <a
                href="https://dashboard.ngrok.com/get-started/your-authtoken"
                target="_blank"
                rel="noreferrer">authtoken</a
              >
              y reclamá tu
              <a href="https://dashboard.ngrok.com/domains" target="_blank" rel="noreferrer"
                >dominio fijo gratis</a
              >.
            </p>
            <label class="field"
              ><span class="label">Authtoken de ngrok</span>
              <input type="password" bind:value={settings.ngrokAuthtoken} /></label
            >
            <label class="field"
              ><span class="label">Dominio fijo</span>
              <input
                type="text"
                placeholder="algo.ngrok-free.app"
                bind:value={settings.ngrokDomain}
              /></label
            >
          </li>

          <li>
            <div class="step-head"><span class="num">3</span> Registrá el webhook en Kick</div>
            <p>
              En el portal de Kick, pegá esta URL como <em>Webhook URL</em> (es fija, se hace una vez):
            </p>
            {#if webhookUrl}
              <div class="url">
                <input readonly value={webhookUrl} />
                <button onclick={copyWebhook}>{copied ? '¡Copiado!' : 'Copiar'}</button>
              </div>
            {:else}
              <p class="hint">Completá el dominio fijo (paso 2) para ver la URL.</p>
            {/if}
          </li>

          <li>
            <div class="step-head"><span class="num">4</span> Guardá y probá</div>
            <p>
              Guardá abajo (levanta el túnel y se suscribe a los follows). Después probá que Kick
              llega:
            </p>
            <div class="test-row">
              <button class="ghost" onclick={test} disabled={testing || !status?.tunnel.url}>
                {testing ? 'Probando…' : 'Probar conexión'}
              </button>
              {#if !status?.tunnel.url}
                <span class="hint">El túnel todavía no está activo (guardá primero).</span>
              {:else if testResult}
                <span class:ok={testResult.reachable} class:bad={!testResult.reachable}>
                  {testResult.reachable
                    ? `✓ Alcanzable (HTTP ${testResult.status})`
                    : `✗ No alcanzable ${testResult.error ?? ''}`}
                </span>
              {/if}
            </div>
          </li>
        </ol>
      </section>
    {/if}

    <!-- Avanzado -->
    <details class="card adv">
      <summary>Avanzado</summary>
      <label class="field"
        ><span class="label">Puerto local</span>
        <input type="number" min="1024" max="65535" bind:value={settings.port} /></label
      >
      <label class="chk">
        <input type="checkbox" bind:checked={settings.autostart} />
        Arrancar con Windows
      </label>
    </details>

    <div class="save-bar">
      <button class="primary" onclick={save} disabled={saving}>
        {saving ? 'Aplicando…' : 'Guardar y aplicar'}
      </button>
    </div>
  </main>
{/if}

<style>
  .wrap {
    height: 100vh;
    overflow-y: auto;
    padding: 2rem 1.5rem 5rem;
    background: radial-gradient(circle at top, #1c2029, #0d0f14);
    color: #f5f7fa;
  }

  header,
  .card,
  .save-bar {
    max-width: 780px;
    margin-left: auto;
    margin-right: auto;
  }

  .back {
    color: #53fc18;
    text-decoration: none;
    font-size: 0.9rem;
  }

  h1 {
    margin: 0.4rem 0 0.25rem;
    font-size: 1.6rem;
  }

  header p {
    margin: 0;
    color: #aeb6c2;
  }

  .card {
    background: #171a21;
    border: 1px solid #262b36;
    border-radius: 12px;
    padding: 1.1rem 1.25rem;
    margin-top: 1rem;
  }

  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.05rem;
  }

  .notice {
    max-width: 620px;
    margin: 15vh auto 0;
    text-align: center;
    color: #aeb6c2;
  }

  .status .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .stat .k {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b94a3;
  }

  .stat .v {
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mono {
    font-family: ui-monospace, monospace;
    font-size: 0.82rem;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #55606f;
    display: inline-block;
  }

  .dot.on {
    background: #53fc18;
    box-shadow: 0 0 8px #53fc18;
  }

  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .mode {
    text-align: left;
    background: #0d0f14;
    border: 1px solid #2a2f3a;
    border-radius: 10px;
    padding: 0.7rem 0.8rem;
    cursor: pointer;
    color: #dfe4ea;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mode strong {
    font-size: 0.95rem;
  }

  .mode span {
    font-size: 0.78rem;
    color: #8b94a3;
    line-height: 1.35;
  }

  .mode.sel {
    border-color: #53fc18;
    box-shadow: 0 0 0 1px #53fc18 inset;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.6rem;
  }

  .label {
    font-size: 0.82rem;
    font-weight: 600;
  }

  input[type='text'],
  input[type='password'],
  input[type='number'] {
    background: #0d0f14;
    border: 1px solid #2a2f3a;
    color: #dfe4ea;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.9rem;
  }

  .hint {
    font-size: 0.8rem;
    color: #8b94a3;
    margin: 0.4rem 0 0;
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .steps li {
    border-left: 2px solid #2a2f3a;
    padding-left: 1rem;
  }

  .step-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    background: #53fc18;
    color: #06210a;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .steps p {
    margin: 0.4rem 0;
    font-size: 0.85rem;
    color: #aeb6c2;
    line-height: 1.45;
  }

  .steps a {
    color: #53fc18;
  }

  .url {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.3rem;
  }

  .url input {
    flex: 1;
    min-width: 0;
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
  }

  .url button,
  button.ghost {
    background: #1d222b;
    color: #dfe4ea;
    border: 1px solid #2a2f3a;
    border-radius: 8px;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .test-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.3rem;
    font-size: 0.85rem;
  }

  .ok {
    color: #53fc18;
  }

  .bad,
  .err {
    color: #ff6b6b;
  }

  .err {
    font-size: 0.82rem;
    margin: 0.6rem 0 0;
  }

  .adv summary {
    cursor: pointer;
    font-weight: 600;
  }

  .chk {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.7rem;
    font-size: 0.9rem;
  }

  .save-bar {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: flex-end;
    padding-top: 1rem;
  }

  button.primary {
    background: #53fc18;
    color: #06210a;
    border: none;
    border-radius: 10px;
    padding: 0.7rem 1.4rem;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  button.primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
