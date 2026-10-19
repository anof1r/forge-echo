import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BindingsController } from '../bindings/bindings.controller';
import {
  BindingDocument,
  BindingSchema,
  MongoBindingRepository,
  MongoTrackRepository,
  TrackDocument,
  TrackSchema,
} from './mongo.repositories';
import { BindingRepository, TrackRepository } from './repositories';
import { TrackStorageService } from './track-storage.service';
import { TracksController } from './tracks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrackDocument.name, schema: TrackSchema },
      { name: BindingDocument.name, schema: BindingSchema },
    ]),
  ],
  controllers: [TracksController, BindingsController],
  providers: [
    { provide: TrackRepository, useClass: MongoTrackRepository },
    { provide: BindingRepository, useClass: MongoBindingRepository },
    { provide: TrackStorageService, useFactory: () => new TrackStorageService(process.env['MEDIA_ROOT'] ?? './media') },
  ],
})
export class TracksModule {}
