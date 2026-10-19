import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { Server, Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BattleForgeSource } from './battle-forge.source';

class FakeBattleForge {
  readonly received: string[] = [];
  readonly sockets: Socket[] = [];
  private readonly data = new Map<string, unknown>();
  private http!: HttpServer;
  private io!: Server;
  url = '';

  async start(port = 0): Promise<void> {
    this.http = createServer();
    this.io = new Server(this.http);
    this.io.on('connection', (socket) => {
      this.sockets.push(socket);
      socket.onAny((event: string) => this.received.push(event));
      socket.on('data:subscribe', ({ path }: { path: string }) => {
        void socket.join(`data:${path}`);
        socket.emit('data:changed', { path, value: this.data.get(path) ?? null });
      });
    });
    await new Promise<void>((resolve) => this.http.listen(port, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.http.address() as AddressInfo).port}`;
  }

  publish(path: string, value: unknown): void {
    this.data.set(path, value);
    this.io.to(`data:${path}`).emit('data:changed', { path, value });
  }

  dropClients(): void {
    this.io.disconnectSockets(true);
  }

  async stop(): Promise<void> {
    await this.io.close();
  }
}

const silentHealth = async (): Promise<Response> => new Response('{}');

const slide = (id: string, order: number) => ({
  id,
  name: `${id}.png`,
  order,
  media: { key: `slides/${id}.webp`, version: 1 },
});

describe('BattleForgeSource', () => {
  let battleForge: FakeBattleForge;
  let source: BattleForgeSource;

  beforeEach(async () => {
    battleForge = new FakeBattleForge();
    await battleForge.start();
  });

  afterEach(async () => {
    source?.stop();
    await battleForge.stop();
  });

  function connect(): BattleForgeSource {
    source = new BattleForgeSource(battleForge.url, silentHealth);
    source.start();
    return source;
  }

  it('starts disconnected with an empty snapshot', () => {
    // Arrange
    source = new BattleForgeSource(battleForge.url, silentHealth);

    // Act
    const snapshot = source.snapshot;

    // Assert
    expect(snapshot).toEqual({
      connection: 'disconnected',
      contract: 'unknown',
      presentation: { mode: 'battle', activeSlideId: null },
      slides: [],
    });
  });

  it('reports a connection once Battle Forge accepts the socket', async () => {
    // Arrange
    connect();

    // Act
    await expectEventually(() => source.snapshot.connection === 'connected');

    // Assert
    expect(source.snapshot.connection).toBe('connected');
  });

  it('loads the current slides and presentation that Battle Forge already has', async () => {
    // Arrange
    battleForge.publish('dm-library/slides', { a: slide('a', 1) });
    battleForge.publish('settings/presentation', { mode: 'story', activeSlideId: 'a' });

    // Act
    connect();
    await expectEventually(() => source.snapshot.slides.length === 1);

    // Assert
    expect(source.snapshot.presentation).toEqual({ mode: 'story', activeSlideId: 'a' });
    expect(source.snapshot.slides[0].mediaPath).toBe('/media/slides/a.webp?v=1');
  });

  it('follows presentation changes published after connecting', async () => {
    // Arrange
    connect();
    await expectEventually(() => source.snapshot.connection === 'connected');

    // Act
    battleForge.publish('settings/presentation', { mode: 'story', activeSlideId: 'b' });
    await expectEventually(() => source.snapshot.presentation.activeSlideId === 'b');

    // Assert
    expect(source.snapshot.presentation.mode).toBe('story');
  });

  it('ignores events for paths it did not subscribe to', async () => {
    // Arrange
    connect();
    await expectEventually(() => source.snapshot.connection === 'connected');
    const before = source.snapshot;

    // Act
    battleForge.sockets[0].emit('data:changed', { path: 'dm-library/characters', value: { x: 1 } });
    await delay(50);

    // Assert
    expect(source.snapshot).toEqual(before);
  });

  it('ignores malformed events', async () => {
    // Arrange
    connect();
    await expectEventually(() => source.snapshot.connection === 'connected');
    const before = source.snapshot;

    // Act
    battleForge.sockets[0].emit('data:changed', null);
    battleForge.sockets[0].emit('data:changed', { value: 1 });
    battleForge.sockets[0].emit('data:changed', 'nope');
    await delay(50);

    // Assert
    expect(source.snapshot).toEqual(before);
  });

  it('only ever sends subscription requests, never writes', async () => {
    // Arrange
    connect();
    await expectEventually(() => source.snapshot.connection === 'connected');

    // Act
    battleForge.publish('settings/presentation', { mode: 'story', activeSlideId: 'a' });
    await delay(50);

    // Assert
    expect(battleForge.received).toEqual(['data:subscribe', 'data:subscribe']);
  });

  it('subscribes again and keeps its state after the connection drops and returns', async () => {
    // Arrange
    connect();
    await expectEventually(() => source.snapshot.connection === 'connected');

    // Act
    battleForge.dropClients();
    await expectEventually(() => battleForge.received.length >= 4, 5000);
    battleForge.publish('settings/presentation', { mode: 'story', activeSlideId: 'c' });
    await expectEventually(() => source.snapshot.presentation.activeSlideId === 'c');

    // Assert
    expect(source.snapshot.connection).toBe('connected');
  });

  it('marks the connection as disconnected when Battle Forge goes away', async () => {
    // Arrange
    connect();
    await expectEventually(() => source.snapshot.connection === 'connected');

    // Act
    await battleForge.stop();
    await expectEventually(() => source.snapshot.connection === 'disconnected');

    // Assert
    expect(source.snapshot.connection).toBe('disconnected');
  });

  it('notifies listeners about every snapshot change and stops after unsubscribe', async () => {
    // Arrange
    const seen: string[] = [];
    source = new BattleForgeSource(battleForge.url, silentHealth);
    const unsubscribe = source.subscribe((snapshot) => seen.push(snapshot.connection));

    // Act
    source.start();
    await expectEventually(() => seen.includes('connected'));
    unsubscribe();
    const count = seen.length;
    battleForge.publish('settings/presentation', { mode: 'story', activeSlideId: 'a' });
    await delay(50);

    // Assert
    expect(seen.length).toBe(count);
  });

  describe('contract compatibility', () => {
    const healthWith = (body: unknown, ok = true) => async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 });

    async function contractFor(fetcher: () => Promise<Response>): Promise<string> {
      source = new BattleForgeSource(battleForge.url, fetcher);
      source.start();
      await expectEventually(() => source.snapshot.contract !== 'unknown');
      return source.snapshot.contract;
    }

    it('is compatible when Battle Forge declares the supported version', async () => {
      // Arrange
      const fetcher = healthWith({ status: 'ok', contracts: { forgeEcho: 1 } });

      // Act
      const contract = await contractFor(fetcher);

      // Assert
      expect(contract).toBe('compatible');
    });

    it('is incompatible when Battle Forge declares another version', async () => {
      // Arrange
      const fetcher = healthWith({ status: 'ok', contracts: { forgeEcho: 2 } });

      // Act
      const contract = await contractFor(fetcher);

      // Assert
      expect(contract).toBe('incompatible');
    });

    it('is incompatible when Battle Forge declares no version at all', async () => {
      // Arrange
      const fetcher = healthWith({ status: 'ok' });

      // Act
      const contract = await contractFor(fetcher);

      // Assert
      expect(contract).toBe('incompatible');
    });

    it('stays unknown when the health request fails', async () => {
      // Arrange
      source = new BattleForgeSource(battleForge.url, async () => {
        throw new Error('offline');
      });

      // Act
      source.start();
      await delay(300);

      // Assert
      expect(source.snapshot.contract).toBe('unknown');
    });

    it('requests only the health endpoint of Battle Forge', async () => {
      // Arrange
      const requested: string[] = [];
      const fetcher = async (url: string) => {
        requested.push(url);
        return new Response('{}');
      };

      // Act
      await contractFor(fetcher as never);

      // Assert
      expect(requested).toEqual([`${battleForge.url}/api/health`]);
    });
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function expectEventually(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition was not met in time.');
    await delay(10);
  }
}
