import type { Listener } from '@ngrok/ngrok';

/**
 * Túnel público automático (ngrok) para el modo oficial de Kick.
 *
 * Kick entrega los follows por webhook (push) a una URL pública. En vez de pedirle
 * al usuario que corra un túnel a mano, la app levanta uno sola con el SDK de ngrok
 * apuntando al server local. Usando el **dominio fijo** (free tier) la URL no cambia
 * entre sesiones, así se registra una única vez en el portal de Kick.
 *
 * El módulo nativo se carga de forma diferida (solo cuando hace falta el túnel):
 * los modos `mock` / `kick-ws` nunca lo tocan.
 */

export interface TunnelOptions {
  /** Puerto local del server a exponer. */
  port: number;
  /** Authtoken de la cuenta de ngrok. */
  authtoken: string;
  /** Dominio fijo (ej. `mi-canal.ngrok-free.app`). Vacío = dominio aleatorio. */
  domain?: string;
}

let listener: Listener | null = null;

/** Carga diferida del SDK nativo de ngrok. */
async function loadNgrok(): Promise<typeof import('@ngrok/ngrok')> {
  return import('@ngrok/ngrok');
}

/**
 * Levanta el túnel y devuelve la URL pública. Cierra cualquier túnel previo.
 * Lanza si el authtoken/dominio son inválidos o el SDK no puede conectar.
 */
export async function startTunnel(opts: TunnelOptions): Promise<string> {
  await stopTunnel();
  if (!opts.authtoken) {
    throw new Error('Falta el authtoken de ngrok (Configuración → Conexión).');
  }

  const ngrok = await loadNgrok();
  listener = await ngrok.forward({
    addr: opts.port,
    authtoken: opts.authtoken,
    ...(opts.domain ? { domain: opts.domain } : {}),
  });

  const url = listener.url();
  if (!url) {
    await stopTunnel();
    throw new Error('ngrok no devolvió una URL pública.');
  }
  return url;
}

/** Cierra el túnel activo (si hay). Nunca lanza. */
export async function stopTunnel(): Promise<void> {
  if (!listener) return;
  try {
    await listener.close();
  } catch {
    /* el túnel ya estaba cerrado o el agente murió: lo ignoramos */
  }
  listener = null;
}

/** URL pública activa, o `null` si el túnel no está levantado. */
export function tunnelUrl(): string | null {
  return listener?.url() ?? null;
}
