import { OnModuleDestroy } from '@nestjs/common';
import { MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { BattleForgeSnapshot, BattleForgeSource } from '../battle-forge/battle-forge.source';

export const STAGE_STATE_EVENT = 'stage:state';

// Pushes the read-only Battle Forge mirror to Forge Echo clients.
@WebSocketGateway({ cors: false })
export class StageGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly source: BattleForgeSource) {}

  afterInit(): void {
    this.unsubscribe = this.source.subscribe((snapshot) => this.server.emit(STAGE_STATE_EVENT, snapshot));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  @SubscribeMessage('stage:get')
  handleState(@MessageBody() _body?: unknown): { event: string; data: BattleForgeSnapshot } {
    return { event: STAGE_STATE_EVENT, data: this.source.snapshot };
  }
}
