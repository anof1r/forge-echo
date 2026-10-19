import { io, Socket } from 'socket.io-client';
import {
  BATTLE_FORGE_PRESENTATION_PATH,
  BATTLE_FORGE_SLIDES_PATH,
  BattleForgePresentation,
  BattleForgeSlide,
  SUPPORTED_CONTRACT_VERSION,
  parseContractVersion,
  parsePresentation,
  parseSlides,
} from './battle-forge.contract';

export type BattleForgeConnection = 'connected' | 'disconnected';

export type BattleForgeContract = 'unknown' | 'compatible' | 'incompatible';
type HealthFetcher = (url: string) => Promise<Response>;

export interface BattleForgeSnapshot {
  connection: BattleForgeConnection;
  contract: BattleForgeContract;
  presentation: BattleForgePresentation;
  slides: BattleForgeSlide[];
}

type SnapshotListener = (snapshot: BattleForgeSnapshot) => void;

/**
 * Read-only mirror of the Battle Forge state forge-echo depends on.
 *
 * The only message this class ever sends is `data:subscribe`, so it cannot
 * modify Battle Forge data. Incoming values are validated by the contract
 * parsers before they reach the snapshot.
 */
export class BattleForgeSource {
  private socket: Socket | null = null;
  private current: BattleForgeSnapshot = {
    connection: 'disconnected',
    contract: 'unknown',
    presentation: { mode: 'battle', activeSlideId: null },
    slides: [],
  };
  private readonly listeners = new Set<SnapshotListener>();

  constructor(
    private readonly url: string,
    private readonly fetcher: HealthFetcher = (target) => fetch(target),
  ) {}

  get snapshot(): BattleForgeSnapshot {
    return this.current;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.socket) return;

    const socket = io(this.url, {
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      transports: ['websocket'],
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.update({ connection: 'connected' });
      void this.checkContract();
      socket.emit('data:subscribe', { path: BATTLE_FORGE_SLIDES_PATH });
      socket.emit('data:subscribe', { path: BATTLE_FORGE_PRESENTATION_PATH });
    });
    socket.on('disconnect', (reason) => {
      this.update({ connection: 'disconnected' });
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.on('connect_error', () => this.update({ connection: 'disconnected' }));
    socket.on('data:changed', (event: unknown) => this.applyChange(event));
  }

  stop(): void {
    this.socket?.close();
    this.socket = null;
    this.update({ connection: 'disconnected' });
  }

  // Read-only GET of the health endpoint; a failure keeps the previous verdict.
  private async checkContract(): Promise<void> {
    try {
      const response = await this.fetcher(`${this.url}/api/health`);
      const version = parseContractVersion(await response.json());
      this.update({ contract: version === SUPPORTED_CONTRACT_VERSION ? 'compatible' : 'incompatible' });
    } catch {
      // Battle Forge may be starting up; the next reconnect checks again.
    }
  }

  private applyChange(event: unknown): void {
    if (event === null || typeof event !== 'object') return;
    const { path, value } = event as { path?: unknown; value?: unknown };

    if (path === BATTLE_FORGE_SLIDES_PATH) this.update({ slides: parseSlides(value) });
    else if (path === BATTLE_FORGE_PRESENTATION_PATH) {
      this.update({ presentation: parsePresentation(value) });
    }
  }

  private update(change: Partial<BattleForgeSnapshot>): void {
    this.current = { ...this.current, ...change };
    for (const listener of this.listeners) listener(this.current);
  }
}
