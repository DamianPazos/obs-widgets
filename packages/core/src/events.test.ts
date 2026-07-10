import { describe, expect, it } from 'vitest';
import { WidgetEventSchema, makeEvent, type FollowerNewEvent } from './index';

describe('WidgetEventSchema', () => {
  it('valida un evento follower.new correcto', () => {
    const event = makeEvent<FollowerNewEvent>({
      type: 'follower.new',
      channel: 'test-channel',
      payload: { username: 'nuevo_seguidor' },
    });

    const parsed = WidgetEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
  });

  it('rechaza un evento con type desconocido', () => {
    const parsed = WidgetEventSchema.safeParse({
      type: 'unknown.event',
      channel: 'test',
      timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(parsed.success).toBe(false);
  });

  it('acepta un follower.new sin username (vía kick-ws, sin nombre)', () => {
    const parsed = WidgetEventSchema.safeParse({
      type: 'follower.new',
      channel: 'test',
      timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza un follower.new con username vacío', () => {
    const parsed = WidgetEventSchema.safeParse({
      type: 'follower.new',
      channel: 'test',
      timestamp: new Date().toISOString(),
      payload: { username: '' },
    });
    expect(parsed.success).toBe(false);
  });
});
