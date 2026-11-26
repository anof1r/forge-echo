import { Injectable } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BindingRepository, OneShotGroupRepository, TrackRepository } from './repositories';
import { Binding, OneShotGroup, Track, TrackKind, TrackPatch } from './track.model';

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
  @Prop({ type: [String], default: [] }) groupIds!: string[];
  @Prop({ type: String, default: null }) imageFile!: string | null;
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

@Schema({ collection: 'oneshot_groups', versionKey: false })
export class OneShotGroupDocument {
  @Prop({ required: true, unique: true }) id!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) createdAt!: number;
  @Prop({ required: true }) updatedAt!: number;
}
export const OneShotGroupSchema = SchemaFactory.createForClass(OneShotGroupDocument);

const NO_ID = { _id: 0 };

@Injectable()
export class MongoTrackRepository extends TrackRepository {
  constructor(@InjectModel(TrackDocument.name) private readonly model: Model<TrackDocument>) {
    super();
  }

  async list(): Promise<Track[]> {
    const tracks = await this.model.find({}, NO_ID).sort({ createdAt: -1, _id: -1 }).lean<Track[]>();
    return tracks.map(withTrackDefaults);
  }

  async get(id: string): Promise<Track | null> {
    const track = await this.model.findOne({ id }, NO_ID).lean<Track>();
    return track ? withTrackDefaults(track) : null;
  }

  async insert(track: Track): Promise<void> {
    await this.model.create(track);
  }

  async update(id: string, patch: TrackPatch, now: number): Promise<Track | null> {
    const track = await this.model
      .findOneAndUpdate({ id }, { $set: { ...patch, updatedAt: now } }, { returnDocument: 'after', projection: NO_ID })
      .lean<Track>();
    return track ? withTrackDefaults(track) : null;
  }

  async remove(id: string): Promise<void> {
    await this.model.deleteOne({ id });
  }
}

function withTrackDefaults(track: Track): Track {
  return { ...track, groupIds: track.groupIds ?? [], imageFile: track.imageFile ?? null };
}

@Injectable()
export class MongoOneShotGroupRepository extends OneShotGroupRepository {
  constructor(@InjectModel(OneShotGroupDocument.name) private readonly model: Model<OneShotGroupDocument>) {
    super();
  }

  async list(): Promise<OneShotGroup[]> {
    return this.model.find({}, NO_ID).sort({ createdAt: 1, _id: 1 }).lean<OneShotGroup[]>();
  }

  async insert(group: OneShotGroup): Promise<void> {
    await this.model.create(group);
  }

  async rename(id: string, name: string, now: number): Promise<OneShotGroup | null> {
    return this.model.findOneAndUpdate({ id }, { $set: { name, updatedAt: now } }, { returnDocument: 'after', projection: NO_ID }).lean<OneShotGroup>();
  }

  async remove(id: string): Promise<boolean> {
    return (await this.model.deleteOne({ id })).deletedCount > 0;
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
