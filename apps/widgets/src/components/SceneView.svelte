<script lang="ts">
  import { decodeScene, instanceUrl } from '../lib/scene';

  const scene = decodeScene(new URLSearchParams(window.location.search).get('scene'));
</script>

<div class="scene">
  {#each scene.instances as inst (inst.id)}
    <iframe
      title={inst.widget}
      class="instance"
      style="left: {inst.rect.x}%; top: {inst.rect.y}%; width: {inst.rect.w}%; height: {inst.rect
        .h}%;"
      src={instanceUrl(inst, { fit: '1' })}
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
