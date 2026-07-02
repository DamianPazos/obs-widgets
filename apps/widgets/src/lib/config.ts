/**
 * Lectura de configuración de un widget desde la query string de la URL.
 * Esto permite configurar cada Browser Source de OBS sin recompilar.
 */

function params(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** URL del servidor relay (WebSocket). Prioridad: ?server= > VITE_SERVER_URL > default. */
export function getServerUrl(): string {
  const fromQuery = params().get('server');
  const fromEnv = import.meta.env.VITE_SERVER_URL;
  return fromQuery ?? fromEnv ?? 'ws://localhost:8787';
}

/** Canal a monitorear (solo widgets realtime). */
export function getChannel(fallback = 'demo'): string {
  return params().get('channel') ?? fallback;
}

/** Lee un parámetro arbitrario de la URL con valor por defecto. */
export function getParam(name: string, fallback = ''): string {
  return params().get(name) ?? fallback;
}

/** Lee un parámetro crudo: `null` si no está en la URL (útil para estilos opcionales). */
export function getRawParam(name: string): string | null {
  return params().get(name);
}
