import { Controller, Get } from '@nestjs/common';
import { BattleForgeConnection, BattleForgeContract, BattleForgeSource } from '../battle-forge/battle-forge.source';

@Controller('api/health')
export class HealthController {
  constructor(private readonly battleForge: BattleForgeSource) {}

  @Get()
  status(): { status: 'ok' | 'degraded'; battleForge: BattleForgeConnection; contract: BattleForgeContract } {
    const { connection, contract } = this.battleForge.snapshot;
    return { status: connection === 'connected' ? 'ok' : 'degraded', battleForge: connection, contract };
  }
}
