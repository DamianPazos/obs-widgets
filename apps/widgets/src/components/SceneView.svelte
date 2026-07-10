<script lang="ts">
  import { decodeScene, instanceUrl } from '../lib/scene';

  const params = new URLSearchParams(window.location.search);
  const scene = decodeScene(params.get('scene'));
  // Escena de prueba: propaga `preview=1` a cada instancia (datos de demo).
  const extra: Record<string, string> =
    params.get('preview') === '1' ? { fit: '1', preview: '1' } : { fit: '1' };
</script>

<div class="scene">
  {#each scene.instances as inst (inst.id)}
    <iframe
      title={inst.widget}
      class="instance"
      style="left: {inst.rect.x}%; top: {inst.rect.y}%; width: {inst.rect.w}%; height: {inst.rect
        .h}%;"
      src={instanceUrl(inst, extra)}
    ></iframe>
  {/each}
</div>

<style>
  .scene {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }

  .instance {
    position: absolute;
    border: 0;
    background: transparent;
  }
</style>
