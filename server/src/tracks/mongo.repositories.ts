import { Injectable } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BindingRepository, TrackRepository } from './repositories';
import { Binding, Track, TrackKind, TrackPatch } from './track.model';

@Schema({ collection: 'tracks', versionKey: false })
export class TrackDocument {
  @Prop({ required: true, unique: true }) id!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) kind!: TrackKind;
  @Prop({ required: true }) file!: string;
  @Prop({ required: true }) mimeType!: string;
  @Prop({ required: true }) sizeBytes!: number;
  @Prop({ required: true }) startMs!: number;
  @Prop({ type: Number, default: null }) endMs!: number | null;
  @Prop({ required: true }) volume!: number;
  @Prop({ required: true }) loop!: boolean;
  @Prop({ required: true }) createdAt!: number;
  @Prop({ required: true }) updatedAt!: number;
}
export const TrackSchema = SchemaFactory.createForClass(TrackDocument);

@Schema({ collection: 'bindings', versionKey: false })
export class BindingDocument {
  @Prop({ required: true, unique: true }) slideId!: string;
  @Prop({ required: true, index: true }) trackId!: string;
  @Prop({ required: true }) fadeInMs!: number;
  @Prop({ required: true }) fadeOutMs!: number;
  @Prop({ required: true }) volume!: number;
  @Prop({ required: true }) updatedAt!: number;
}
export const BindingSchema = SchemaFactory.createForClass(BindingDocument);

const NO_ID = { _id: 0 };

@Injectable()
export class MongoTrackRepository extends TrackRepository {
  constructor(@InjectModel(TrackDocument.name) private readonly model: Model<TrackDocument>) {
    super();
  }

  async list(): Promise<Track[]> {
    return this.model.find({}, NO_ID).sort({ createdAt: -1, _id: -1 }).lean<Track[]>();
  }

  async get(id: string): Promise<Track | null> {
    return this.model.findOne({ id }, NO_ID).lean<Track>();
  }

  async insert(track: Track): Promise<void> {
    await this.model.create(track);
  }

  async update(id: string, patch: TrackPatch, now: number): Promise<Track | null> {
    return this.model
      .findOneAndUpdate({ id }, { $set: { ...patch, updatedAt: now } }, { returnDocument: 'after', projection: NO_ID })
      .lean<Track>();
  }

  async remove(id: string): Promise<void> {
    await this.model.deleteOne({ id });
  }
}

@Injectable()
export class MongoBindingRepository extends BindingRepository {
  constructor(@InjectModel(BindingDocument.name) private readonly model: Model<BindingDocument>) {
    super();
  }

  async list(): Promise<Binding[]> {
    return this.model.find({}, NO_ID).lean<Binding[]>();
  }

  async upsert(binding: Binding): Promise<void> {
    await this.model.replaceOne({ slideId: binding.slideId }, binding, { upsert: true });
  }

  async remove(slideId: string): Promise<boolean> {
    return (await this.model.deleteOne({ slideId })).deletedCount > 0;
  }

  async removeByTrack(trackId: string): Promise<void> {
    await this.model.deleteMany({ trackId });
  }
}
