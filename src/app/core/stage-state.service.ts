import { InjectionToken, Injectable, inject, signal } from '@angular/core';
import { io } from 'socket.io-client';
import { StageState } from './models';

export interface StageSocket {
  on(event: string, handler: (payload?: unknown) => void): unknown;
  emit(event: string): unknown;
}

export const STAGE_SOCKET = new InjectionToken<StageSocket>('STAGE_SOCKET', {
  providedIn: 'root',
  factory: () => io({ transports: ['websocket'] }),
});

const EMPTY: StageState = { connection: 'disconnected', contract: 'unknown', presentation: { mode: 'battle', activeSlideId: null }, slides: [] };

const isStageState = (value: unknown): value is StageState => {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<StageState>;
  return Array.isArray(candidate.slides) && typeof candidate.presentation === 'object' && candidate.presentation !== null;
};

// Mirrors the Battle Forge state that the server pushes to this client.
@Injectable({ providedIn: 'root' })
export class StageStateService {
  readonly state = signal<StageState>(EMPTY);
  readonly serverReachable = signal(false);

  constructor() {
    const socket = inject(STAGE_SOCKET);
    socket.on('connect', () => {
      this.serverReachable.set(true);
      socket.emit('stage:get');
    });
    socket.on('disconnect', () => {
      this.serverReachable.set(false);
      this.state.update((current) => ({ ...current, connection: 'disconnected' }));
    });
    socket.on('stage:state', (payload) => {
      if (isStageState(payload)) this.state.set(payload);
    });
  }
}
