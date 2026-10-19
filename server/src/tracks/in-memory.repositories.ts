import { BindingRepository, TrackRepository } from './repositories';
import { Binding, Track, TrackPatch } from './track.model';

export class InMemoryTrackRepository extends TrackRepository {
  private readonly items: Track[] = [];

  async list(): Promise<Track[]> {
    return [...this.items].reverse().sort((a, b) => b.createdAt - a.createdAt);
  }

  async get(id: string): Promise<Track | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async insert(track: Track): Promise<void> {
    this.items.push({ ...track });
  }

  async update(id: string, patch: TrackPatch, now: number): Promise<Track | null> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.items[index] = { ...this.items[index], ...patch, updatedAt: now };
    return { ...this.items[index] };
  }

  async remove(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) this.items.splice(index, 1);
  }
}

export class InMemoryBindingRepository extends BindingRepository {
  private items: Binding[] = [];

  async list(): Promise<Binding[]> {
    return this.items.map((item) => ({ ...item }));
  }

  async upsert(binding: Binding): Promise<void> {
    this.items = [...this.items.filter((item) => item.slideId !== binding.slideId), { ...binding }];
  }

  async remove(slideId: string): Promise<boolean> {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.slideId !== slideId);
    return this.items.length < before;
  }

  async removeByTrack(trackId: string): Promise<void> {
    this.items = this.items.filter((item) => item.trackId !== trackId);
  }
}
