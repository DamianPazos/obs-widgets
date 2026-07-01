import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetEventSchema } from '@obs-widgets/core';
import { MockEventSource } from './mock-source';

describe('MockEventSource', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emite eventos follower.new válidos en el intervalo configurado', async () => {
    const source = new MockEventSource({ channel: 'demo', intervalMs: 1000 });
    const received: unknown[] = [];
    source.onEvent((e) => received.push(e));

    await source.start();
    vi.advanceTimersByTime(3000);
    await source.stop();

    expect(received.length).toBe(3);
    for (const event of received) {
      const parsed = WidgetEventSchema.safeParse(event);
      expect(parsed.success).toBe(true);
    }
  });
});
