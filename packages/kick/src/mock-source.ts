import { BaseEventSource, makeEvent, type FollowerNewEvent } from '@obs-widgets/core';

const SAMPLE_USERNAMES = [
  'streamfan_23',
  'kraken_live',
  'pixel_wolf',
  'nova_gg',
  'la_tota',
  'don_ramon',
  'mate_amargo',
  'susan_dev',
];

export interface MockSourceOptions {
  channel: string;
  /** Cada cuánto emitir un evento de prueba (ms). Por defecto 15s. */
  intervalMs?: number;
}

/**
 * Fuente de eventos falsa: genera "nuevos seguidores" cada cierto tiempo.
 * Sirve para desarrollar y previsualizar widgets sin credenciales de Kick.
 */
export class MockEventSource extends BaseEventSource {
  readonly name = 'mock';
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly options: MockSourceOptions) {
    super();
  }

  async start(): Promise<void> {
    const intervalMs = this.options.intervalMs ?? 15_000;
    this.timer = setInterval(() => this.emitRandomFollower(), intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private emitRandomFollower(): void {
    const username = SAMPLE_USERNAMES[Math.floor(Math.random() * SAMPLE_USERNAMES.length)]!;
    this.emit(
      makeEvent<FollowerNewEvent>({
        type: 'follower.new',
        channel: this.options.channel,
        payload: { username },
      }),
    );
  }
}
