<script lang="ts">
  /**
   * Bloque reutilizable con los dos links listos para OBS:
   * - 🟢 Producción: datos reales (se ve cuando estás en vivo).
   * - 🧪 Prueba: datos de demo (`preview=1`) para posicionar en OBS sin estar en vivo.
   *
   * Lo usan el panel de Personalizar, el modal de la pantalla de inicio y el
   * constructor de escenas.
   */
  let { prodUrl, testUrl }: { prodUrl: string; testUrl: string } = $props();

  let copied = $state<'prod' | 'test' | null>(null);

  async function copy(kind: 'prod' | 'test'): Promise<void> {
    await navigator.clipboard.writeText(kind === 'prod' ? prodUrl : testUrl);
    copied = kind;
    setTimeout(() => (copied = null), 1500);
  }
</script>

<div class="urls">
  <div class="url-row">
    <div class="url-label">
      <strong>🟢 Producción</strong>
      <span>Datos reales. Se muestra cuando estás <b>en vivo</b> en Kick.</span>
    </div>
    <div class="url">
      <input readonly value={prodUrl} />
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

<style>
  .urls {
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
