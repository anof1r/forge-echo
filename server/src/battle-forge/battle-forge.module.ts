import { Global, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { readEnvironment } from '../config/environment';
import { BattleForgeSource } from './battle-forge.source';

@Global()
@Module({
  providers: [
    {
      provide: BattleForgeSource,
      useFactory: () => new BattleForgeSource(readEnvironment().battleForgeUrl),
    },
  ],
  exports: [BattleForgeSource],
})
export class BattleForgeModule implements OnModuleInit, OnApplicationShutdown {
  constructor(private readonly source: BattleForgeSource) {}

  onModuleInit(): void {
    this.source.start();
  }

  onApplicationShutdown(): void {
    this.source.stop();
  }
}
