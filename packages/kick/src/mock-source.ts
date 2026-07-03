import {
  BaseEventSource,
  makeEvent,
  type FollowerNewEvent,
  type StreamStatusEvent,
  type StreamViewersEvent,
} from '@obs-widgets/core';

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
  /** Cada cuánto variar los espectadores (ms). Por defecto 5s. */
  viewersMs?: number;
}

/**
 * Fuente de eventos falsa: genera "nuevos seguidores" cada cierto tiempo y
 * varía la cantidad de espectadores. Sirve para desarrollar y previsualizar
 * widgets sin credenciales de Kick.
 */
export class MockEventSource extends BaseEventSource {
  readonly name = 'mock';
  private timer: NodeJS.Timeout | null = null;
  private viewersTimer: NodeJS.Timeout | null = null;
  private viewers = 42;

  constructor(private readonly options: MockSourceOptions) {
    super();
  }

  async start(): Promise<void> {
    // Estado inicial: en vivo desde ahora (alimenta el widget de uptime).
    this.emit(
      makeEvent<StreamStatusEvent>({
        type: 'stream.status',
        channel: this.options.channel,
        payload: { live: true, startedAt: new Date().toISOString() },
      }),
    );
    this.emitViewers();

    const intervalMs = this.options.intervalMs ?? 15_000;
    this.timer = setInterval(() => this.emitRandomFollower(), intervalMs);

    const viewersMs = this.options.viewersMs ?? 5_000;
    this.viewersTimer = setInterval(() => {
      // Paseo aleatorio: sube/baja hasta 8 espectadores por tick.
      this.viewers = Math.max(0, this.viewers + Math.floor(Math.random() * 17) - 8);
      this.emitViewers();
    }, viewersMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.viewersTimer) {
      clearInterval(this.viewersTimer);
      this.viewersTimer = null;
    }
  }

  private emitViewers(): void {
    this.emit(
      makeEvent<StreamViewersEvent>({
        type: 'stream.viewers',
        channel: this.options.channel,
        payload: { viewers: this.viewers, live: true },
      }),
    );
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
