# Arquitectura

El objetivo de diseño es que **agregar un widget o una plataforma nueva no
obligue a tocar el resto del sistema**. Para eso separamos el proyecto en capas
con dependencias que apuntan siempre hacia el dominio (arquitectura limpia /
hexagonal).

## Capas

```
┌───────────────────────────────────────────────────────────┐
│  Presentación            apps/widgets  (Svelte, corre en OBS) │
├───────────────────────────────────────────────────────────┤
│  Aplicación / Transporte apps/server   (Fastify + WebSocket)  │
├───────────────────────────────────────────────────────────┤
│  Infraestructura         packages/kick (adapters de fuentes)  │
├───────────────────────────────────────────────────────────┤
│  Dominio                 packages/core (contratos + puertos)  │
└───────────────────────────────────────────────────────────┘
```

- **`packages/core` (Dominio).** No depende de nada. Define:
  - Los **eventos** de negocio (`WidgetEvent`) validados con Zod.
  - El **puerto** `EventSource`: la abstracción de cualquier fuente de eventos.
  - El **contrato de transporte** widget ↔ servidor (`ClientMessage` / `ServerMessage`).

- **`packages/kick` (Infraestructura).** Implementaciones concretas del puerto:
  - `MockEventSource`: genera eventos falsos (desarrollo/preview).
  - `KickWsSource`: se conecta **saliente** al WebSocket público de Kick (sin credenciales
    ni túnel). Los follows no vienen por ahí, así que se detectan por el contador.
  - `KickEventSource`: modo **oficial** — se suscribe por API y normaliza los webhooks de
    Kick a `WidgetEvent` (el único que trae el **nombre** del seguidor).

- **`apps/server` (Aplicación).** Orquesta: elige la fuente por configuración,
  la conecta a un `EventBus` y reparte los eventos a los widgets por WebSocket.
  No conoce a Kick directamente, solo al puerto `EventSource`.

- **`apps/widgets` (Presentación).** Cada widget es un componente Svelte que se
  auto-registra. Los widgets _realtime_ se suscriben al servidor; los _offline_
  no dependen de nada externo.

## Regla de dependencias

```
widgets ─▶ core ◀─ server ─▶ kick ─▶ core
```

Todo apunta a `core`. Ni el dominio ni los widgets saben que existe Kick.

## Flujo de un evento en tiempo real

1. Kick envía un **webhook** a `POST /webhooks/kick`.
2. `KickEventSource.ingestWebhook()` **verifica la firma** y **normaliza** el
   payload a un `WidgetEvent`.
3. El evento se publica en el `EventBus`.
4. El `EventBus` lo reenvía por **WebSocket** a los widgets suscriptos a ese
   canal y tipo de evento.
5. El widget en OBS renderiza la alerta.

## Puntos de extensión

| Quiero…                        | Toco…                                                     |
| ------------------------------ | --------------------------------------------------------- |
| Un widget nuevo                | `apps/widgets/src/widgets/<id>/` (nada más)               |
| Un tipo de evento nuevo        | `packages/core/src/events.ts` + mapeo en el adapter       |
| Una plataforma nueva (Twitch…) | nuevo adapter en `packages/` que implemente `EventSource` |
| Cambiar la fuente activa       | variable de entorno `EVENT_SOURCE`                        |

## Decisiones

- **Monorepo con paquetes internos en TS source.** Los paquetes exponen su
  `src/index.ts` directamente; Vite/tsx/tsup transpilan. Cero paso de build para
  iterar entre paquetes.
- **Zod como frontera de confianza.** Nada entra al sistema (webhook, mensaje
  WebSocket) sin validarse contra un esquema.
- **Servidor relay en vez de conexión directa desde el navegador.** Permite
  verificar firmas, ocultar credenciales y soportar eventos que solo llegan por
  webhook. El puerto `EventSource` deja abierta la puerta a fuentes directas.
- **Túnel embebido en el desktop (modo oficial).** Los webhooks de Kick necesitan una
  URL pública estable. La app de escritorio levanta un túnel (`@ngrok/ngrok`, dominio
  fijo) apuntando al server local, así el usuario no corre nada a mano. La URL del
  webhook se registra una única vez en el portal de Kick (no se puede setear por API).
