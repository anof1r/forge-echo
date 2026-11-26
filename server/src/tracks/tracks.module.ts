import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BindingsController } from '../bindings/bindings.controller';
import {
  BindingDocument,
  BindingSchema,
  MongoBindingRepository,
  MongoOneShotGroupRepository,
  OneShotGroupDocument,
  OneShotGroupSchema,
  MongoTrackRepository,
  TrackDocument,
  TrackSchema,
} from './mongo.repositories';
import { BindingRepository, TrackRepository } from './repositories';
import { OneShotGroupRepository } from './repositories';
import { TrackStorageService } from './track-storage.service';
import { TracksController } from './tracks.controller';
import { OneShotGroupsController } from './one-shot-groups.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrackDocument.name, schema: TrackSchema },
      { name: BindingDocument.name, schema: BindingSchema },
      { name: OneShotGroupDocument.name, schema: OneShotGroupSchema },
    ]),
  ],
  controllers: [TracksController, BindingsController, OneShotGroupsController],
  providers: [
    { provide: TrackRepository, useClass: MongoTrackRepository },
    { provide: BindingRepository, useClass: MongoBindingRepository },
    { provide: OneShotGroupRepository, useClass: MongoOneShotGroupRepository },
    { provide: TrackStorageService, useFactory: () => new TrackStorageService(process.env['MEDIA_ROOT'] ?? './media') },
  ],
})
export class TracksModule {}
