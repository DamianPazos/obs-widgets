import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SettingsStore, toConfigOverrides } from './settings';

describe('SettingsStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'obs-settings-'));
    file = join(dir, 'settings.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('arranca con los defaults si no hay archivo', () => {
    expect(new SettingsStore(file).get()).toEqual(DEFAULT_SETTINGS);
  });

  it('persiste y recarga en una instancia nueva', () => {
    new SettingsStore(file).save({ eventSource: 'kick-ws', channel: 'mi_canal', port: 9000 });
    const reloaded = new SettingsStore(file).get();
    expect(reloaded).toMatchObject({ eventSource: 'kick-ws', channel: 'mi_canal', port: 9000 });
  });

  it('sanea valores inválidos', () => {
    const s = new SettingsStore(file);
    // @ts-expect-error: probamos un modo inválido a propósito
    const out = s.save({ eventSource: 'twitch', channel: '  ', port: -5 });
    expect(out).toMatchObject({ eventSource: 'mock', channel: 'demo', port: 8787 });
  });

  it('mapea a overrides de config del server', () => {
    expect(
      toConfigOverrides({ eventSource: 'kick-ws', channel: 'x', port: 8787, autostart: false }),
    ).toEqual({
      EVENT_SOURCE: 'kick-ws',
      KICK_CHANNEL: 'x',
      PORT: 8787,
    });
  });
});
