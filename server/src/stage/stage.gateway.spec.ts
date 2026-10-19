import { describe, expect, it } from 'vitest';
import { BattleForgeSnapshot } from '../battle-forge/battle-forge.source';
import { StageGateway } from './stage.gateway';

const snapshot = (activeSlideId: string | null): BattleForgeSnapshot => ({
  connection: 'connected',
  contract: 'compatible',
  presentation: { mode: 'story', activeSlideId },
  slides: [{ id: 'aa-1', name: 'Tavern', order: 0, mediaPath: '/media/slides/aa-1.webp?v=1' }],
});

class FakeSource {
  snapshot = snapshot('aa-1');
  private listener: ((value: BattleForgeSnapshot) => void) | null = null;
  unsubscribed = false;

  subscribe(listener: (value: BattleForgeSnapshot) => void): () => void {
    this.listener = listener;
    return () => {
      this.unsubscribed = true;
    };
  }

  push(value: BattleForgeSnapshot): void {
    this.snapshot = value;
    this.listener?.(value);
  }
}

class FakeServer {
  emitted: Array<{ event: string; payload: unknown }> = [];
  emit(event: string, payload: unknown): void {
    this.emitted.push({ event, payload });
  }
}

describe('StageGateway', () => {
  it('broadcasts every Battle Forge change as stage:state', () => {
    // Arrange
    const source = new FakeSource();
    const server = new FakeServer();
    const gateway = new StageGateway(source as never);
    gateway.server = server as never;
    gateway.afterInit();

    // Act
    source.push(snapshot('aa-2'));

    // Assert
    expect(server.emitted).toEqual([{ event: 'stage:state', payload: snapshot('aa-2') }]);
  });

  it('answers a client request with the current snapshot', () => {
    // Arrange
    const source = new FakeSource();
    const gateway = new StageGateway(source as never);

    // Act
    const result = gateway.handleState();

    // Assert
    expect(result).toEqual({ event: 'stage:state', data: snapshot('aa-1') });
  });

  it('stops listening to Battle Forge when destroyed', () => {
    // Arrange
    const source = new FakeSource();
    const gateway = new StageGateway(source as never);
    gateway.server = new FakeServer() as never;
    gateway.afterInit();

    // Act
    gateway.onModuleDestroy();

    // Assert
    expect(source.unsubscribed).toBe(true);
  });
});
