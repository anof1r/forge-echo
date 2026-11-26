import { Binding, OneShotGroup, Track, TrackPatch } from './track.model';

export abstract class TrackRepository {
  abstract list(): Promise<Track[]>;
  abstract get(id: string): Promise<Track | null>;
  abstract insert(track: Track): Promise<void>;
  abstract update(id: string, patch: TrackPatch, now: number): Promise<Track | null>;
  abstract remove(id: string): Promise<void>;
}

export abstract class BindingRepository {
  abstract list(): Promise<Binding[]>;
  abstract upsert(binding: Binding): Promise<void>;
  abstract remove(slideId: string): Promise<boolean>;
  abstract removeByTrack(trackId: string): Promise<void>;
}

export abstract class OneShotGroupRepository {
  abstract list(): Promise<OneShotGroup[]>;
  abstract insert(group: OneShotGroup): Promise<void>;
  abstract rename(id: string, name: string, now: number): Promise<OneShotGroup | null>;
  abstract remove(id: string): Promise<boolean>;
}
