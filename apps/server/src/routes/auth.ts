import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildAuthorizeUrl, exchangeCodeForToken } from '@obs-widgets/kick';
import type { AppConfig } from '../config';

const base64url = (buf: Buffer): string => buf.toString('base64url');

/**
 * Flujo OAuth 2.0 (PKCE) con Kick. Punto de partida para obtener tokens y luego
 * suscribir la app a los eventos del canal.
 *
 * Los `code_verifier` se guardan en memoria por `state`. Para producción,
 * reemplazar por un store persistente (Redis, DB) y proteger las rutas.
 */
export function registerAuthRoutes(app: FastifyInstance, config: AppConfig): void {
  const pendingVerifiers = new Map<string, string>();

  const scopes = ['user:read', 'channel:read', 'events:subscribe'];
  const redirectUri = `${config.PUBLIC_URL ?? `http://localhost:${config.PORT}`}/auth/kick/callback`;

  app.get('/auth/kick', async (_req, reply) => {
    if (!config.KICK_CLIENT_ID) {
      return reply.code(500).send({ error: 'Falta KICK_CLIENT_ID en la configuración.' });
    }

    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const state = base64url(randomBytes(16));
    pendingVerifiers.set(state, verifier);

    const url = buildAuthorizeUrl({
      clientId: config.KICK_CLIENT_ID,
      redirectUri,
      scopes,
      state,
      codeChallenge: challenge,
    });
    return reply.redirect(url);
  });

  app.get<{ Querystring: { code?: string; state?: string } }>(
    '/auth/kick/callback',
    async (req, reply) => {
      const { code, state } = req.query;
      if (!code || !state) {
        return reply.code(400).send({ error: 'Faltan code o state.' });
      }
      const verifier = pendingVerifiers.get(state);
      if (!verifier) {
        return reply.code(400).send({ error: 'state desconocido o expirado.' });
      }
      pendingVerifiers.delete(state);

      if (!config.KICK_CLIENT_ID || !config.KICK_CLIENT_SECRET) {
        return reply.code(500).send({ error: 'Faltan credenciales de Kick.' });
      }

      const token = await exchangeCodeForToken({
        clientId: config.KICK_CLIENT_ID,
        clientSecret: config.KICK_CLIENT_SECRET,
        code,
        redirectUri,
        codeVerifier: verifier,
      });

      // TODO: persistir el token y suscribir la app a los eventos del canal.
      return reply.send({
        ok: true,
        note: 'Token obtenido. Guardalo de forma segura y usalo para suscribir eventos.',
        token,
      });
    },
  );
}
