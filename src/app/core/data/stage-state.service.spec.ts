import { TestBed } from '@angular/core/testing';
import { STAGE_SOCKET, StageSocket, StageStateService } from './stage-state.service';

class FakeSocket implements StageSocket {
  readonly handlers = new Map<string, (payload?: unknown) => void>();
  readonly emitted: string[] = [];

  on(event: string, handler: (payload?: unknown) => void): void {
    this.handlers.set(event, handler);
  }

  emit(event: string): void {
    this.emitted.push(event);
  }

  fire(event: string, payload?: unknown): void {
    this.handlers.get(event)?.(payload);
  }
}

const snapshot = {
  connection: 'connected',
  contract: 'compatible',
  presentation: { mode: 'story', activeSlideId: 's1' },
  slides: [{ id: 's1', name: 'Tavern', order: 0, mediaPath: '/media/slides/aa.webp?v=1' }],
};

describe('StageStateService', () => {
  let socket: FakeSocket;
  let service: StageStateService;

  beforeEach(() => {
    socket = new FakeSocket();
    TestBed.configureTestingModule({ providers: [{ provide: STAGE_SOCKET, useValue: socket }] });
    service = TestBed.inject(StageStateService);
  });

  it('starts disconnected with no slides', () => {
    // Arrange - fresh service

    // Act
    const state = service.state();

    // Assert
    expect(state.connection).toBe('disconnected');
    expect(state.slides).toEqual([]);
    expect(service.serverReachable()).toBe(false);
  });

  it('requests the current state when the socket connects', () => {
    // Arrange - fresh service

    // Act
    socket.fire('connect');

    // Assert
    expect(socket.emitted).toEqual(['stage:get']);
    expect(service.serverReachable()).toBe(true);
  });

  it('stores a pushed Battle Forge snapshot', () => {
    // Arrange
    socket.fire('connect');

    // Act
    socket.fire('stage:state', snapshot);

    // Assert
    expect(service.state().presentation.activeSlideId).toBe('s1');
    expect(service.state().slides).toHaveLength(1);
  });

  it('ignores malformed payloads', () => {
    // Arrange
    socket.fire('stage:state', snapshot);

    // Act
    socket.fire('stage:state', { nonsense: true });
    socket.fire('stage:state', null);

    // Assert
    expect(service.state().presentation.activeSlideId).toBe('s1');
  });

  it('marks Battle Forge disconnected when the socket drops but keeps slides', () => {
    // Arrange
    socket.fire('connect');
    socket.fire('stage:state', snapshot);

    // Act
    socket.fire('disconnect');

    // Assert
    expect(service.serverReachable()).toBe(false);
    expect(service.state().connection).toBe('disconnected');
    expect(service.state().slides).toHaveLength(1);
  });
});
