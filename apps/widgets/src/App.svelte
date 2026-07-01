<script lang="ts">
  import Index from './components/Index.svelte';
  import { getWidget } from './lib/registry';

  const id = new URLSearchParams(window.location.search).get('widget');
  const widget = id ? getWidget(id) : undefined;
</script>

{#if !id}
  <Index />
{:else if !widget}
  <div class="error">
    <p>No existe un widget con id <code>{id}</code>.</p>
    <a href="/">Ver widgets disponibles</a>
  </div>
{:else}
  {#await widget.load() then mod}
    {@const Widget = mod.default}
    <Widget />
  {/await}
{/if}

<style>
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
