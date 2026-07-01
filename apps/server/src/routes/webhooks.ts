import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { KickEventSource } from '@obs-widgets/kick';

/** Fastify guarda el body crudo en `rawBody` (ver content-type parser en app.ts). */
type RawBodyRequest = FastifyRequest & { rawBody?: string };

/**
 * Recibe los webhooks de Kick, verifica la firma y emite el evento normalizado.
 * Requiere una URL pública (usá un túnel en local: ngrok, cloudflared, etc.).
 */
export function registerWebhookRoute(app: FastifyInstance, kick: KickEventSource): void {
  app.post('/webhooks/kick', async (req: RawBodyRequest, reply) => {
    const headers = {
      messageId: String(req.headers['kick-event-message-id'] ?? ''),
      timestamp: String(req.headers['kick-event-message-timestamp'] ?? ''),
      signature: String(req.headers['kick-event-signature'] ?? ''),
      eventType: String(req.headers['kick-event-type'] ?? ''),
      version: String(req.headers['kick-event-version'] ?? ''),
    };

    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const accepted = kick.ingestWebhook(headers, rawBody);

    if (!accepted) {
      req.log.warn({ headers }, 'Webhook de Kick descartado (firma o tipo)');
      return reply.code(202).send({ accepted: false });
    }

    return reply.code(200).send({ accepted: true });
  });
}
