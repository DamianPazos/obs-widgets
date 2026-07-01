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

## Épica 3 — Eventos en tiempo real de Kick 🚧

Alertas conectadas a la plataforma.

### HU-3.1 — Servidor relay ✅

> Como **streamer**, quiero un servidor que reciba eventos y los mande a mis widgets.

**Tareas**

- ✅ Fastify + `@fastify/websocket`.
- ✅ `EventBus` con filtrado por canal y tipo.
- ✅ Fuente `mock` para probar sin credenciales.
- ✅ Endpoint `POST /debug/emit`.

### HU-3.2 — Widget "Alerta de Nuevo Seguidor" ✅

> Como **streamer**, quiero ver una alerta animada cuando alguien me sigue en Kick.

**Criterios de aceptación**

- Se suscribe al canal indicado en la URL.
- Encola alertas y las muestra de a una.
- Reconexión automática si se cae el servidor.

**Tareas**

- ✅ Cliente WebSocket con reconexión.
- ✅ `FollowerAlert.svelte` con cola de alertas.

### HU-3.3 — Integración real con la API de Kick 🚧

> Como **streamer**, quiero recibir seguidores/subs reales desde Kick.

**Criterios de aceptación**

- Suscripción a eventos del canal automatizada. ✅
- Webhooks verificados por firma (RSA-SHA256). ✅
- OAuth 2.1 (PKCE) de usuario funcionando end-to-end.

**Tareas**

- ✅ `KickApiClient`: app token, canal→id, alta/listado de suscripciones.
- ✅ Auto-suscripción a follows/subs al iniciar (`KickEventSource.start()`).
- ✅ Verificación de firma de webhooks + tests, **validada con webhooks reales de Kick**.
- ✅ Mapeo de eventos reales (followed, subscription.new/renewal/gifts, chat).
- ✅ Documentar el paso a paso (README).
- ✅ **Probado end-to-end en vivo**: follows reales → firma OK (0 descartes) → HTTP 200 → alerta.
- 🚧 Flujo OAuth de usuario (rutas `/auth/kick*`) — base lista, falta persistir tokens.
- ⬜ Widget dedicado de `subscription.new` y renovaciones (issue #3).

---

## Épica 4 — Experiencia de despliegue ⬜

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

---

## Épica 5 — Más widgets ⬜

Ampliar el catálogo.

**Ideas / Historias**

- ⬜ HU-5.1 — Meta de seguidores (barra de progreso).
- ⬜ HU-5.2 — Último seguidor / último sub persistente.
- ⬜ HU-5.3 — Chat overlay.
- ⬜ HU-5.4 — Contador regresivo "empieza en…".
- ⬜ HU-5.5 — Alerta de donación/regalo de subs.

---

## Deuda técnica / mejoras

- ⬜ Tests e2e de un widget con Playwright.
- ⬜ Panel de configuración visual (generador de URLs).
- ⬜ Temas/skins reutilizables entre widgets.
- ⬜ Rate limiting y healthchecks en el servidor.
- ⬜ Sonidos en las alertas.
