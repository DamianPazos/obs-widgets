# Backlog — Historias y Tareas

Backlog del proyecto organizado en **épicas → historias de usuario → tareas**.
Estado: ✅ hecho · 🚧 en progreso · ⬜ pendiente.

Roles:

- **Streamer**: usa los widgets en OBS.
- **Dev/Contribuidor**: extiende el proyecto (widgets, plataformas).

---

## Épica 1 — Fundaciones del proyecto ✅

Base técnica para poder construir sobre algo sólido.

### HU-1.1 — Monorepo con arquitectura limpia ✅

> Como **dev**, quiero un monorepo con capas separadas para agregar widgets/plataformas sin romper el resto.

**Criterios de aceptación**

- El dominio (`core`) no depende de infraestructura.
- La fuente de eventos se cambia por configuración.

**Tareas**

- ✅ Configurar pnpm workspaces + Turborepo.
- ✅ `tsconfig.base` estricto compartido.
- ✅ Definir puerto `EventSource` y contratos de eventos con Zod.

### HU-1.2 — Calidad automatizada ✅

> Como **dev**, quiero linters, formato, tipos y tests para mantener el código sano.

**Tareas**

- ✅ ESLint + Prettier + EditorConfig.
- ✅ Vitest en `core`, `kick` y `server`.
- ✅ Husky + commitlint (conventional commits).
- ✅ CI en GitHub Actions (lint + typecheck + test + build).

---

## Épica 2 — Widgets offline (MVP) ✅

Widgets que funcionan sin conexión, para validar el flujo de punta a punta.

### HU-2.1 — Widget "Live Streaming" ✅

> Como **streamer**, quiero un banner "EN VIVO" con reloj para mi pantalla de inicio.

**Criterios de aceptación**

- Se agrega como Browser Source con una URL.
- Título y subtítulo configurables por query string.
- Fondo transparente.

**Tareas**

- ✅ Componente `LiveStreaming.svelte` con animación.
- ✅ Parámetros `title`, `subtitle`, `accent`.

### HU-2.2 — Registro automático de widgets ✅

> Como **dev**, quiero que un widget nuevo se registre solo al crear su carpeta.

**Tareas**

- ✅ `registry.ts` con `import.meta.glob`.
- ✅ Página índice con URL copiable por widget.

---

## Épica 3 — Eventos en tiempo real de Kick ✅

Alertas conectadas a la plataforma.

### HU-3.1 — Servidor relay ✅

> Como **streamer**, quiero un servidor que reciba eventos y los mande a mis widgets.

**Tareas**

- ✅ Fastify + `@fastify/websocket`.
- ✅ `EventBus` con filtrado por canal y tipo.
- ✅ Fuente `mock` para probar sin credenciales.
- ✅ Endpoint `POST /debug/emit`.

### HU-3.4 — Estado del stream (en vivo / offline) ✅

> Como **streamer**, quiero que los widgets sepan solos cuándo estoy en vivo.

**Tareas**

- ✅ Evento de dominio `stream.status` (live + startedAt).
- ✅ Mapeo de `livestream.status.updated` + lectura del estado inicial vía `/channels`.
- ✅ El server guarda el último estado y le manda un **snapshot** al widget que se conecta
  (funciona aunque abras el widget con el stream ya empezado).

### HU-3.2 — Widget "Alerta de Nuevo Seguidor" ✅

> Como **streamer**, quiero ver una alerta animada cuando alguien me sigue en Kick.

**Criterios de aceptación**

- Se suscribe al canal indicado en la URL.
- Encola alertas y las muestra de a una.
- Reconexión automática si se cae el servidor.

**Tareas**

- ✅ Cliente WebSocket con reconexión.
- ✅ `FollowerAlert.svelte` con cola de alertas.

### HU-3.3 — Integración real con la API de Kick ✅

> Como **streamer**, quiero recibir seguidores/subs reales desde Kick.

**Criterios de aceptación**

- Suscripción a eventos del canal automatizada. ✅
- Webhooks verificados por firma (RSA-SHA256). ✅
- OAuth 2.1 (PKCE) de usuario funcionando end-to-end. ✅

**Tareas**

- ✅ `KickApiClient`: app token, canal→id, alta/listado de suscripciones.
- ✅ Auto-suscripción a follows/subs al iniciar (`KickEventSource.start()`).
- ✅ Verificación de firma de webhooks + tests, **validada con webhooks reales de Kick**.
- ✅ Mapeo de eventos reales (followed, subscription.new/renewal/gifts, chat).
- ✅ Documentar el paso a paso (README).
- ✅ **Probado end-to-end en vivo**: follows reales → firma OK (0 descartes) → HTTP 200 → alerta.
- ✅ Flujo OAuth de usuario (`/auth/kick`, `/callback`, `/status`): PKCE + persistencia
  de tokens en disco (`TokenStore`) + renovación automática con el refresh token.

### HU-3.5 — Widget "Alerta de Suscripción" ✅

> Como **streamer**, quiero una alerta cuando alguien se suscribe, renueva o regala subs.

**Tareas**

- ✅ Evento `subscription.new` con `kind` (new/renewal/gift) + `count` de regalos.
- ✅ Mapeo de `channel.subscription.new/renewal/gifts` distinguiendo cada caso.
- ✅ `SubAlert.svelte` con cola de alertas y texto según el tipo.

---

## Épica 4 — Experiencia de despliegue 🚧

Que cualquiera pueda usarlo en su máquina fácilmente.

### HU-4.1 — Docker para el servidor ⬜

> Como **streamer**, quiero levantar el servidor con un comando.

**Tareas**

- ✅ `Dockerfile` del servidor.
- ⬜ `docker-compose` con túnel opcional.

### HU-4.2 — Publicar widgets como estáticos ⬜

> Como **streamer**, quiero servir los widgets sin tener mi PC prendida.

**Tareas**

- ⬜ Guía de deploy a GitHub Pages / Netlify.
- ⬜ Workflow de deploy automático del build de `widgets`.

### HU-4.3 — App de escritorio (Electron) ✅

> Como **streamer**, quiero abrir un programa junto con OBS que sirva todos los widgets
> en localhost, sin levantar nada a mano ni depender de un hosting.

**Tareas**

- ✅ **Fase 1**: `apps/desktop` (Electron) que embebe el server (`startEventServer`) y
  sirve el build de widgets vía `@fastify/static`; ventana con el panel + ícono en la
  bandeja (cerrar = seguir en segundo plano); una sola instancia; entry `headless` y
  config de `electron-builder` (NSIS).
- ✅ **Fase 2**: fuente **WS saliente** (`KickWsSource`, `EVENT_SOURCE=kick-ws`): la app se
  conecta al WebSocket público de Kick y escucha follows/subs/regalos/chat/estado, sin
  credenciales, sin túnel y sin webhooks (solo el slug del canal). Resuelve los ids del
  canal/chatroom por el endpoint público y pollea el viewer_count. _(Vía no oficial;
  probada en vivo: resuelve ids, conecta y suscribe.)_
- ✅ **Fase 3**: panel de **settings** (elegir fuente/canal/puerto sin tocar `.env`, se
  aplica en caliente reiniciando la fuente), **autostart** con el SO, **auto-update**
  (electron-updater + Releases de GitHub) y **workflow de release** que publica el
  instalador al empujar un tag `v*`. El modo `kick-ws` resuelve el canal con la red de
  Chromium (saltea Cloudflare); si la fuente falla, el server igual levanta (el panel y
  los widgets offline siguen funcionando).

---

## Épica 5 — Más widgets ⬜

Ampliar el catálogo.

**Ideas / Historias**

- ✅ HU-5.0 — Tiempo en vivo (uptime): cuenta el tiempo de stream, se prende/apaga solo.
- ✅ HU-5.6 — Contador de espectadores: muestra en vivo la audiencia (polling de Kick + snapshot).
- ⬜ HU-5.1 — Meta de seguidores (barra de progreso).
- ⬜ HU-5.2 — Último seguidor / último sub persistente.
- ⬜ HU-5.3 — Chat overlay.
- ⬜ HU-5.4 — Contador regresivo "empieza en…".
- ⬜ HU-5.5 — Alerta de donación/regalo de subs.

---

## Deuda técnica / mejoras

- ⬜ Tests e2e de un widget con Playwright.
- ✅ Panel de configuración visual: params tipados + formulario auto-generado + preview en vivo + URL lista (`/?config=<id>`).
- ✅ Estilos ricos por widget: tamaño, tipografía, bordes, colores, fondo e imágenes (variables CSS).
- ✅ Editor de posición: arrastrar objetos dentro de cada widget (lienzo + `?edit=1`), con
  cuadrícula + imán (snap), y panel contextual al seleccionar un objeto (posición X/Y + tamaño).
- ⬜ Temas/skins reutilizables entre widgets.
- ⬜ Rate limiting y healthchecks en el servidor.
- ⬜ Sonidos en las alertas.
