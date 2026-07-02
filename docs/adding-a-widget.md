# Cómo agregar un widget

Gracias al registro automático, crear un widget es crear **una carpeta con dos
archivos**. No hay que registrar nada a mano.

## 1. Creá la carpeta

```
apps/widgets/src/widgets/mi-widget/
  ├─ manifest.ts
  └─ MiWidget.svelte
```

## 2. `manifest.ts`

```ts
import type { WidgetManifest } from '../../lib/manifest';

export const manifest: WidgetManifest = {
  id: 'mi-widget', // usado en la URL: ?widget=mi-widget
  name: 'Mi Widget',
  description: 'Qué hace este widget.',
  mode: 'offline', // 'offline' | 'realtime'
  params: [
    { name: 'texto', label: 'Texto a mostrar', type: 'text', default: 'Hola mundo' },
    { name: 'color', label: 'Color', type: 'color', default: 'ffffff' },
  ],
  load: () => import('./MiWidget.svelte'),
};
```

Los `params` son **tipados** (`text` | `color` | `number` | `range` | `boolean` | `select` |
`image`) y a partir de ellos el **panel de personalización** (`/?config=mi-widget`) genera el
formulario solo, con vista previa en vivo. Regla: el `default` del manifest debe coincidir con el
fallback que usás al leer el parámetro en el componente. Los colores viajan sin `#` en la URL (el
widget se lo antepone).

### Estilos comunes (tamaño, tipografía, bordes, colores, fondo, imágenes)

Sumá los controles de estilo compartidos con `styleParams(...)` y aplicá `themeStyle()` en el
elemento raíz de tu widget:

```ts
// manifest.ts
import { styleParams } from '../../lib/style';
params: [
  /* ...tus params... */
  ...styleParams('scale', 'font', 'fg', 'bg', 'bgOpacity', 'borderWidth', 'borderColor', 'radius', 'bgImage'),
],
```

```svelte
<!-- MiWidget.svelte -->
<script lang="ts">
  import { themeStyle } from '../../lib/style';
</script>

<div class="card" style={themeStyle()}>…</div>

<style>
  .card {
    /* referenciá las variables con un fallback = tu look por defecto */
    transform: scale(var(--w-scale, 1));
    color: var(--w-fg, #fff);
    background-color: var(--w-bg, rgba(13, 15, 20, 0.85));
    background-image: var(--w-bg-image, none);
    border: var(--w-border-width, 1px) solid var(--w-border-color, #53fc18);
    border-radius: var(--w-radius, 12px);
    font-family: var(--w-font, inherit);
  }
</style>
```

`themeStyle()` solo emite la variable de lo que el usuario cambió, así el widget conserva su
aspecto por defecto en todo lo demás.

## 3. `MiWidget.svelte` (offline)

```svelte
<script lang="ts">
  import { getParam } from '../../lib/config';
  const texto = getParam('texto', 'Hola mundo');
</script>

<div class="box">{texto}</div>

<style>
  .box {
    /* recordá: OBS usa fondo transparente */
  }
</style>
```

## 4. Widget en tiempo real

Si `mode: 'realtime'`, declarás los eventos que consumís y te suscribís al
servidor:

```ts
// manifest.ts
mode: 'realtime',
events: ['follower.new'],
```

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { connectEvents } from '../../lib/event-stream';
  import { getChannel, getServerUrl } from '../../lib/config';

  let ultimo = $state<string | null>(null);

  onMount(() =>
    connectEvents({
      serverUrl: getServerUrl(),
      channel: getChannel(),
      events: ['follower.new'],
      onEvent: (e) => {
        if (e.type === 'follower.new') ultimo = e.payload.username;
      },
    }),
  );
</script>

{#if ultimo}<p>¡Gracias por seguir, {ultimo}!</p>{/if}
```

## 5. Probalo

```bash
pnpm dev
```

Abrí http://localhost:5173 — tu widget ya aparece en el listado con su URL para OBS.

## ¿Necesitás un evento nuevo?

Si tu widget requiere un evento que todavía no existe (ej. `raid.new`):

1. Agregá la variante al `WidgetEventSchema` en
   [packages/core/src/events.ts](../packages/core/src/events.ts).
2. Mapeá la fuente (ej. Kick) a ese evento en
   [packages/kick/src/kick-webhooks.ts](../packages/kick/src/kick-webhooks.ts).
3. Consumilo desde el widget filtrando por `type`.
