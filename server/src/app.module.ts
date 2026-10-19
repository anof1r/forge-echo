import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BattleForgeModule } from './battle-forge/battle-forge.module';
import { HealthController } from './health/health.controller';
import { StageModule } from './stage/stage.module';
import { TracksModule } from './tracks/tracks.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/forge-echo'),
    BattleForgeModule,
    TracksModule,
    StageModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
