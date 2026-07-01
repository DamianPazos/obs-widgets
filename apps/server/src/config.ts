import 'dotenv/config';
import { z } from 'zod';

/** Convierte "true"/"false" (string de env) en boolean, con default. */
function boolFromEnv(defaultValue: boolean) {
  return z
    .union([z.boolean(), z.string()])
    .default(defaultValue)
    .transform((v) => (typeof v === 'boolean' ? v : v.toLowerCase() === 'true'));
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  CORS_ORIGIN: z.string().default('*'),
  EVENT_SOURCE: z.enum(['mock', 'kick']).default('mock'),
  ENABLE_DEBUG_ENDPOINT: boolFromEnv(false),

  KICK_CHANNEL: z.string().default('demo'),
  KICK_CLIENT_ID: z.string().optional(),
  KICK_CLIENT_SECRET: z.string().optional(),
  PUBLIC_URL: z.string().url().optional(),
  KICK_VERIFY_SIGNATURE: boolFromEnv(true),
  KICK_WEBHOOK_PUBLIC_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración inválida (revisá tu .env):\n${issues}`);
  }
  return parsed.data;
}
