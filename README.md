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
| Alerta Seguidor | `http://localhost:5173/?widget=follower-alert&channel=demo&duration=6000`    |

> Para publicar los widgets sin tener la PC prendida, corré `pnpm --filter @obs-widgets/widgets build`
> y serví la carpeta `apps/widgets/dist` en cualquier hosting estático (Netlify, GitHub Pages, etc.).

---

## 🟢 Conectar con Kick (eventos reales)

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
