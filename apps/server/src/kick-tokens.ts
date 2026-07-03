import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { refreshAccessToken, type TokenResponse } from '@obs-widgets/kick';

/**
 * Tokens de usuario de Kick persistidos en disco.
 *
 * Es una herramienta local de un solo usuario: guardamos los tokens en un
 * archivo JSON (ignorado por git) para que autorizar una vez alcance. Para un
 * despliegue multiusuario habría que mover esto a una DB cifrada.
 */
export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms en que expira el access token. */
  expiresAt: number;
  scope?: string;
}

/** Margen para renovar el token antes de que expire de verdad. */
const REFRESH_SKEW_MS = 60_000;

export class TokenStore {
  private tokens: StoredTokens | null = null;

  constructor(private readonly file: string) {
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(this.file)) {
        this.tokens = JSON.parse(readFileSync(this.file, 'utf8')) as StoredTokens;
      }
    } catch {
      this.tokens = null; // archivo corrupto: arrancamos sin tokens
    }
  }

  private persist(): void {
    writeFileSync(this.file, JSON.stringify(this.tokens, null, 2), { mode: 0o600 });
  }

  /** Guarda una respuesta de token del flujo OAuth. */
  save(token: TokenResponse): StoredTokens {
    this.tokens = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
    };
    this.persist();
    return this.tokens;
  }

  /** Últimos tokens guardados (sin renovar), si hay. */
  peek(): StoredTokens | null {
    return this.tokens;
  }

  /** `true` si hay tokens guardados. */
  get authorized(): boolean {
    return this.tokens != null;
  }

  /**
   * Devuelve un access token válido, renovándolo con el refresh token si está
   * por expirar. `null` si no hay tokens o no se pudo renovar.
   */
  async getValidAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
    if (!this.tokens) return null;
    if (this.tokens.expiresAt - REFRESH_SKEW_MS > Date.now()) {
      return this.tokens.accessToken;
    }
    if (!this.tokens.refreshToken) return null;

    try {
      const refreshed = await refreshAccessToken({
        clientId,
        clientSecret,
        refreshToken: this.tokens.refreshToken,
      });
      // Kick puede no devolver un refresh_token nuevo: conservamos el anterior.
      refreshed.refresh_token ??= this.tokens.refreshToken;
      return this.save(refreshed).accessToken;
    } catch {
      return null;
    }
  }
}
