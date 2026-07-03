import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TokenStore } from './kick-tokens';

describe('TokenStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kick-tokens-'));
    file = join(dir, 'tokens.json');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('arranca sin autorización si el archivo no existe', () => {
    const store = new TokenStore(file);
    expect(store.authorized).toBe(false);
    expect(store.peek()).toBeNull();
  });

  it('persiste los tokens y los recarga en una instancia nueva', () => {
    const store = new TokenStore(file);
    store.save({ access_token: 'a1', refresh_token: 'r1', token_type: 'bearer', expires_in: 3600 });

    expect(store.authorized).toBe(true);
    expect(existsSync(file)).toBe(true);

    const reloaded = new TokenStore(file);
    expect(reloaded.peek()?.accessToken).toBe('a1');
    expect(reloaded.peek()?.refreshToken).toBe('r1');
  });

  it('devuelve el access token cacheado si todavía no expira (sin red)', async () => {
    const store = new TokenStore(file);
    store.save({ access_token: 'a1', refresh_token: 'r1', token_type: 'bearer', expires_in: 3600 });

    const token = await store.getValidAccessToken('id', 'secret');
    expect(token).toBe('a1');
  });
});
