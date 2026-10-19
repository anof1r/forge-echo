import { Module } from '@nestjs/common';
import { readEnvironment } from '../config/environment';
import { BATTLE_FORGE_URL, SlideMediaController } from './slide-media.controller';
import { StageGateway } from './stage.gateway';

@Module({
  controllers: [SlideMediaController],
  providers: [StageGateway, { provide: BATTLE_FORGE_URL, useFactory: () => readEnvironment().battleForgeUrl }],
})
export class StageModule {}
