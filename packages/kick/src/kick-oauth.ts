/**
 * Helpers para el flujo OAuth 2.0 (con PKCE) de Kick.
 *
 * Se usan para autorizar la app y poder suscribirse a los eventos del canal.
 * Endpoints según la documentación de Kick para desarrolladores.
 * Docs: https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
 */

const KICK_AUTHORIZE_URL = 'https://id.kick.com/oauth/authorize';
const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';

export interface AuthorizeUrlParams {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
}

/** Construye la URL a la que redirigir al usuario para autorizar la app. */
export function buildAuthorizeUrl(params: AuthorizeUrlParams): string {
  const url = new URL(KICK_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/** Intercambia el `code` recibido en el callback por tokens de acceso. */
export async function exchangeCodeForToken(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(KICK_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Kick token exchange falló: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as TokenResponse;
}
