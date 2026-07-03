import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetEventSchema, type WidgetEvent } from '@obs-widgets/core';
import { MockEventSource } from './mock-source';

describe('MockEventSource', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emite estado inicial (status + viewers) y follower.new en el intervalo', async () => {
    const source = new MockEventSource({ channel: 'demo', intervalMs: 1000, viewersMs: 2000 });
    const received: WidgetEvent[] = [];
    source.onEvent((e) => received.push(e));

    await source.start();
    vi.advanceTimersByTime(3000);
    await source.stop();

    // Todos los eventos deben cumplir el contrato.
    for (const event of received) {
      expect(WidgetEventSchema.safeParse(event).success).toBe(true);
    }

    // Estado inicial de stream + espectadores + 3 seguidores en 3 segundos.
    expect(received[0]?.type).toBe('stream.status');
    expect(received.some((e) => e.type === 'stream.viewers')).toBe(true);
    expect(received.filter((e) => e.type === 'follower.new')).toHaveLength(3);
  });
});
