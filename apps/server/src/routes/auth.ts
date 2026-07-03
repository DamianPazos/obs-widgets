import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { buildAuthorizeUrl, exchangeCodeForToken } from '@obs-widgets/kick';
import type { AppConfig } from '../config';
import { TokenStore } from '../kick-tokens';

const base64url = (buf: Buffer): string => buf.toString('base64url');

/** Página HTML mínima para el navegador (el callback lo abre una persona). */
function htmlPage(reply: FastifyReply, status: number, title: string, body: string): FastifyReply {
  return reply
    .code(status)
    .type('text/html; charset=utf-8')
    .send(
      `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0d0f14;color:#f5f7fa;display:flex;min-height:100vh;align-items:center;justify-content:center">
  <div style="max-width:480px;padding:2rem;text-align:center">
    <h1 style="margin:0 0 .5rem">${title}</h1>
    <div style="color:#aeb6c2;line-height:1.5">${body}</div>
  </div>
</body></html>`,
    );
}

/**
 * Flujo OAuth 2.0 (PKCE) con Kick. Obtiene tokens de usuario y los persiste en
 * disco (vía TokenStore) para autorizar una sola vez.
 *
 * Rutas:
 *  - `GET /auth/kick`          → redirige a Kick para autorizar.
 *  - `GET /auth/kick/callback` → canjea el code, persiste los tokens.
 *  - `GET /auth/kick/status`   → estado de la autorización (JSON).
 */
export function registerAuthRoutes(app: FastifyInstance, config: AppConfig): void {
  const pendingVerifiers = new Map<string, string>();
  const tokens = new TokenStore(config.KICK_TOKENS_FILE);

  const scopes = ['user:read', 'channel:read', 'events:subscribe'];
  const redirectUri = `${config.PUBLIC_URL ?? `http://localhost:${config.PORT}`}/auth/kick/callback`;

  app.get('/auth/kick', async (_req, reply) => {
    if (!config.KICK_CLIENT_ID) {
      return htmlPage(
        reply,
        500,
        'Falta configuración',
        'No está definido <code>KICK_CLIENT_ID</code>.',
      );
    }

    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const state = base64url(randomBytes(16));
    pendingVerifiers.set(state, verifier);
    // Limpieza de states viejos para no acumular en memoria.
    setTimeout(() => pendingVerifiers.delete(state), 10 * 60_000).unref?.();

    const url = buildAuthorizeUrl({
      clientId: config.KICK_CLIENT_ID,
      redirectUri,
      scopes,
      state,
      codeChallenge: challenge,
    });
    return reply.redirect(url);
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/auth/kick/callback',
    async (req, reply) => {
      const { code, state, error } = req.query;
      if (error) {
        return htmlPage(
          reply,
          400,
          'Autorización cancelada',
          `Kick devolvió: <code>${error}</code>.`,
        );
      }
      if (!code || !state) {
        return htmlPage(
          reply,
          400,
          'Faltan datos',
          'No llegaron <code>code</code> o <code>state</code>.',
        );
      }
      const verifier = pendingVerifiers.get(state);
      if (!verifier) {
        return htmlPage(
          reply,
          400,
          'Sesión expirada',
          'El <code>state</code> es desconocido o expiró. Volvé a empezar en <a style="color:#53fc18" href="/auth/kick">/auth/kick</a>.',
        );
      }
      pendingVerifiers.delete(state);

      if (!config.KICK_CLIENT_ID || !config.KICK_CLIENT_SECRET) {
        return htmlPage(reply, 500, 'Falta configuración', 'Faltan credenciales de Kick.');
      }

      try {
        const token = await exchangeCodeForToken({
          clientId: config.KICK_CLIENT_ID,
          clientSecret: config.KICK_CLIENT_SECRET,
          code,
          redirectUri,
          codeVerifier: verifier,
        });
        const saved = tokens.save(token);
        const mins = Math.round((saved.expiresAt - Date.now()) / 60_000);
        return htmlPage(
          reply,
          200,
          '✅ ¡Autorizado!',
          `Los tokens se guardaron en el servidor. Ya podés cerrar esta pestaña.<br><br>` +
            `<small>Permisos: <code>${saved.scope ?? scopes.join(' ')}</code> · ` +
            `expira en ~${mins} min (se renueva solo).</small>`,
        );
      } catch (err) {
        req.log.error(err);
        return htmlPage(
          reply,
          502,
          'Error al canjear el token',
          'Kick rechazó el intercambio. Revisá las credenciales y probá de nuevo.',
        );
      }
    },
  );

  app.get('/auth/kick/status', async () => {
    const stored = tokens.peek();
    if (!stored) return { authorized: false };

    const valid =
      config.KICK_CLIENT_ID && config.KICK_CLIENT_SECRET
        ? (await tokens.getValidAccessToken(config.KICK_CLIENT_ID, config.KICK_CLIENT_SECRET)) !=
          null
        : stored.expiresAt > Date.now();

    return {
      authorized: true,
      valid,
      scope: stored.scope,
      expiresAt: new Date(stored.expiresAt).toISOString(),
      canRefresh: Boolean(stored.refreshToken),
    };
  });
}
