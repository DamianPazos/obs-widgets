# OBS Widgets

Colección de **widgets para OBS** (vía _Browser Source_) construida con una
**arquitectura limpia** pensada para que agregar un widget nuevo sea trivial.

Hay dos tipos de widgets:

- **Offline** — no necesitan conexión ni servidor (ej. `Live Streaming`: un banner "EN VIVO").
- **Tiempo real** — reaccionan a eventos de la plataforma (ej. `Alerta de Nuevo Seguidor` en Kick).

> Proyecto open source (MIT). Cloná el repo y usalo en tu propia máquina.

---

## ✨ Características

- 🧩 **Arquitectura de plugins**: cada widget se auto-registra. Crear uno nuevo = una carpeta.
- 🎨 **Panel de personalización visual**: editá colores, textos y opciones con vista previa en vivo y copiá la URL lista para OBS (formulario auto-generado desde cada widget).
- 🔌 **Puertos y adaptadores**: la fuente de eventos (Kick, mock, …) es intercambiable por config.
- 🟢 **Integración con Kick** vía la API oficial (OAuth + webhooks).
- 🧪 **Modo mock** para desarrollar y previsualizar sin credenciales.
- ⚡ **Svelte + Vite**: bundles chicos, ideales para overlays.
- 🧰 Monorepo con **TypeScript estricto**, ESLint, Prettier, Vitest y CI.

---

## 🏗️ Arquitectura (resumen)

```
apps/
  widgets/   → Frontend Svelte. Cada widget es un Browser Source de OBS.
  server/    → Servidor relay (Fastify + WebSocket). Recibe eventos y los reenvía.
  desktop/   → App de escritorio (Electron). Levanta el server y sirve los widgets en localhost.
packages/
  core/      → Dominio: contratos de eventos, puertos y transporte (Zod).
  kick/      → Adapters de fuentes: MockEventSource y KickEventSource.
```

Flujo de un evento en tiempo real:

```
Kick ──webhook──▶ server (adapter Kick) ──WebSocket──▶ widget en OBS
                    ▲
              (mock genera eventos de prueba)
```

Los widgets **offline** no tocan el servidor: se abren directo en OBS.
Más detalle en [docs/architecture.md](docs/architecture.md).

---

## 🚀 Requisitos

- [Node.js](https://nodejs.org/) **20+** (recomendado 22)
- [pnpm](https://pnpm.io/) **9+** (`npm install -g pnpm`)
- OBS Studio (con _Browser Source_)

---

## 📦 Instalación

```bash
git clone https://github.com/DamianPazos/obs-widgets.git
cd obs-widgets
pnpm install
```

---

## 🖥️ App de escritorio (recomendado para usar con OBS)

En vez de dejar el dev server prendido, podés correr la **app de escritorio**: abre
una ventana con el panel y, por debajo, **levanta el server y sirve todos los widgets
en `localhost`**. La abrís junto con OBS y apuntás las _Browser Source_ a
`http://localhost:8787/?widget=...`.

```bash
pnpm --filter @obs-widgets/desktop dev      # compila widgets + abre la app
```

- **Server en la bandeja**: cerrás la ventana y la app queda como ícono en la bandeja
  (el server sigue vivo mientras streameás). Desde ahí: _Abrir panel_, _Configuración_,
  _Copiar URL base_ o _Salir_.
- **Configuración sin `.env`**: en _Configuración_ elegís la **fuente** (mock / Kick WS /
  Kick oficial), el **canal**, el **puerto** y si **arranca con Windows**. Se aplica al
  instante (reinicia la fuente sin cerrar la app). Los widgets **siguen solos** ese canal:
  las _Browser Source_ de OBS no necesitan `channel=`, así pasás de demo a real sin tocarlas.
- **Kick sin fricción**: con el modo **Kick (WS)** la app se conecta al WebSocket de Kick
  usando la red de Chromium (resuelve el canal aunque el endpoint esté tras Cloudflare) —
  sin credenciales ni túnel.
- **Un solo origen local**: los widgets se sirven desde el mismo server, así que se
  conectan al WebSocket sin configurar nada (`ws://localhost:8787` por defecto).
- **Auto-update**: la app instalada busca nuevas versiones en las Releases de GitHub, las
  descarga en segundo plano y te avisa para reiniciar y aplicarlas.
- **Sin GUI**: `pnpm --filter @obs-widgets/desktop start:headless` corre solo el server.
- **Instalador**: `pnpm --filter @obs-widgets/desktop package` genera un `.exe` (NSIS) en
  `apps/desktop/release/`. En CI, al empujar un tag `v*` se publica solo (ver
  `.github/workflows/release.yml`).

---

## ▶️ Uso rápido (modo demo, sin Kick)

Levantás el frontend y el servidor con la fuente mock (genera "seguidores" de prueba):

```bash
# copiá la config del servidor (queda en modo mock por defecto)
cp apps/server/.env.example apps/server/.env

pnpm dev
```

Esto arranca:

- **Widgets** en http://localhost:5173 (página índice con la URL de cada widget)
- **Servidor** en http://localhost:8787

Abrí http://localhost:5173, copiá la URL de un widget y pegala en OBS.

### Disparar un evento de prueba

Con `ENABLE_DEBUG_ENDPOINT=true` (default del `.env.example`):

```bash
curl -X POST http://localhost:8787/debug/emit \
  -H "content-type: application/json" \
  -d '{"type":"follower.new","username":"tester","channel":"demo"}'
```

Deberías ver la alerta en el widget `follower-alert`.

---

## 🎥 Agregar un widget en OBS

1. En OBS: **Fuentes → + → Navegador**.
2. Pegá la URL del widget (la copiás desde http://localhost:5173).
3. Configurá **Ancho 1920** / **Alto 1080** (o lo que necesites).
4. Cada widget acepta parámetros por la URL, por ejemplo:

| Widget          | Ejemplo de URL                                                               |
| --------------- | ---------------------------------------------------------------------------- |
| Live Streaming  | `http://localhost:5173/?widget=live-streaming&title=EN%20VIVO&subtitle=Hola` |
| Alerta Seguidor | `http://localhost:5173/?widget=follower-alert&duration=6000`                 |
| Alerta de Sub   | `http://localhost:5173/?widget=sub-alert`                                    |
| Tiempo en Vivo  | `http://localhost:5173/?widget=stream-uptime`                                |
| Espectadores    | `http://localhost:5173/?widget=viewer-count`                                 |

> **El `channel` es opcional**: si no lo ponés, el widget sigue el canal configurado
> en la app/server. Así cambiás entre demo y tu canal real desde un solo lugar sin
> editar las URLs de OBS. (Podés forzar uno con `&channel=tu_canal` si querés.)
>
> Con la **app de escritorio** el host es `http://localhost:8787` en vez de `:5173`.
> También podés combinar varios widgets en una sola _Browser Source_ con el
> **constructor de escenas** (`/?builder`).

> Para publicar los widgets sin tener la PC prendida, corré `pnpm --filter @obs-widgets/widgets build`
> y serví la carpeta `apps/widgets/dist` en cualquier hosting estático (Netlify, GitHub Pages, etc.).

### 🎨 Personalizar sin tocar código

En la página índice, tocá **⚙ Personalizar** en cualquier widget. Se abre un panel
(`/?config=<id>`) donde ajustás colores, textos y opciones con **vista previa en vivo**
y te da la **URL lista para copiar** a OBS. El formulario se genera automáticamente a
partir de los parámetros declarados en el `manifest` de cada widget, así que **cada widget
nuevo obtiene su personalizador gratis**.

Podés ajustar **tamaño/escala, tipografía (familia y grosor), bordes (grosor/color/redondeo),
colores de texto y fondo + opacidad, e imágenes** (la imagen de fondo se **sube desde un archivo**
y se embebe reescalada, sin depender de ninguna URL/hosting). Los
estilos comunes se agregan a un widget con `styleParams(...)` y se aplican por variables CSS
(`themeStyle()`), manteniendo el look por defecto salvo lo que toques.

Además podés **reubicar los objetos** (ícono, textos, timer) dentro de la vista previa: cada
widget es un **lienzo** y las posiciones quedan guardadas en la URL (`layout=`). En el editor:

- **Arrastrá** cualquier objeto para moverlo, con **cuadrícula** e **imán (snap)** opcionales para
  alinear prolijo.
- **Clickeá** un objeto y a la izquierda aparecen sus opciones (posición X/Y y tamaño).
- Para que **floten libres** (sin caja), poné el borde en 0 y la opacidad de fondo en 0.

---

## 🟢 Conectar con Kick (eventos reales)

Hay dos modos:

### Modo simple: `kick-ws` (sin credenciales ni túnel) — recomendado para empezar

La app se **conecta al WebSocket público de Kick** y escucha subs, regalos, chat y
estado del stream. No necesitás credenciales, ni túnel, ni webhooks: solo el
**slug del canal**.

```env
EVENT_SOURCE=kick-ws
KICK_CHANNEL=tu_canal
```

Levantás con `pnpm dev` (o la app de escritorio) y listo. Es la vía **no oficial** (la
que usan los overlays de terceros): puede cambiar si Kick modifica su front, pero es la
más cómoda para uso personal.

> ⚠️ **Follows en `kick-ws`**: Kick **no transmite los follows por el WS público**, así
> que la alerta de nuevo seguidor se dispara detectando que sube el contador de
> seguidores del canal (se consulta cada ~15s). Por eso aparece con un pequeño retraso y
> **sin el nombre** de quien siguió. Si querés el **nombre real** del seguidor al instante,
> usá el **modo oficial** (`kick`, con webhooks): el evento `channel.followed` sí lo trae.

### Modo oficial: `kick` (API + webhooks)

El servidor automatiza casi todo: con las credenciales de tu app obtiene el
token, **resuelve el id del canal**, **se suscribe solo a los eventos** (follows
y subs) y **descarga la clave pública** para verificar las firmas de los webhooks.

**1. Creá una app** en el [portal de desarrolladores de Kick](https://kick.com/settings/developer)
y guardá `client_id` y `client_secret`.

**2. Exponé el servidor con un túnel** (los webhooks necesitan una URL pública):

```bash
ngrok http 8787          # o: cloudflared tunnel --url http://localhost:8787
```

**3. En el panel de Kick**, habilitá los webhooks y configurá el _Webhook URL_
apuntando a `https://<tu-tunel>/webhooks/kick`.

**4. Completá `apps/server/.env`:**

```env
EVENT_SOURCE=kick
KICK_CHANNEL=tu_canal
KICK_CLIENT_ID=xxxx
KICK_CLIENT_SECRET=xxxx
PUBLIC_URL=https://tu-tunel.ngrok-free.app
KICK_VERIFY_SIGNATURE=true
```

**5. Levantá todo con `pnpm dev`.** En el log del server vas a ver la suscripción
creada. Seguí el canal desde otra cuenta y la alerta aparece en `follower-alert`.

> ⚠️ La API de Kick está en evolución. Los nombres/versiones de eventos y el
> mapeo de payloads viven en [packages/kick/src/kick-webhooks.ts](packages/kick/src/kick-webhooks.ts)
> y son fáciles de ajustar en un solo lugar.

---

## 🧩 Crear un widget nuevo

Guía completa: [docs/adding-a-widget.md](docs/adding-a-widget.md). En resumen:

```
src/widgets/mi-widget/
  ├─ manifest.ts       # metadatos + carga diferida del componente
  └─ MiWidget.svelte   # la UI del overlay
```

No hace falta registrar nada: el `registry` descubre la carpeta automáticamente.

---

## 🛠️ Scripts

| Comando          | Qué hace                                      |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Levanta widgets + servidor en modo desarrollo |
| `pnpm build`     | Compila todos los paquetes                    |
| `pnpm lint`      | ESLint en todo el monorepo                    |
| `pnpm typecheck` | Chequeo de tipos (TS + svelte-check)          |
| `pnpm test`      | Tests con Vitest                              |
| `pnpm format`    | Formatea con Prettier                         |

---

## 🤝 Contribuir

Se aceptan PRs. Leé [CONTRIBUTING.md](CONTRIBUTING.md) y el
[backlog de historias y tareas](docs/backlog.md).

## 📄 Licencia

[MIT](LICENSE) — usalo, modificalo y compartilo libremente.
