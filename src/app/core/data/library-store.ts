import { Injectable, inject, signal } from '@angular/core';
import { ForgeApi } from './forge-api';
import { Binding, BindingInput, OneShotGroup, Track, TrackKind, TrackPatch } from './models';

@Injectable({ providedIn: 'root' })
export class LibraryStore {
  private readonly api = inject(ForgeApi);

  readonly tracks = signal<Track[]>([]);
  readonly bindings = signal<Binding[]>([]);
  readonly oneShotGroups = signal<OneShotGroup[]>([]);
  readonly error = signal<string | null>(null);

  async refresh(): Promise<void> {
    await this.run(async () => {
      const [tracks, bindings, groups] = await Promise.all([
        this.api.listTracks(),
        this.api.listBindings(),
        this.api.listOneShotGroups(),
      ]);
      this.tracks.set(tracks);
      this.bindings.set(bindings);
      this.oneShotGroups.set(groups);
    });
  }

  async upload(file: File, kind: TrackKind, name?: string): Promise<void> {
    await this.run(async () => {
      const track = await this.api.uploadTrack(file, kind, name);
      this.tracks.update((tracks) => [track, ...tracks]);
    });
  }

  async patch(id: string, patch: TrackPatch): Promise<void> {
    await this.run(async () => {
      const track = await this.api.patchTrack(id, patch);
      this.tracks.update((tracks) => tracks.map((item) => (item.id === id ? track : item)));
    });
  }

  async uploadArtwork(id: string, file: File): Promise<void> {
    await this.run(async () => {
      const track = await this.api.uploadArtwork(id, file);
      this.tracks.update((tracks) => tracks.map((item) => (item.id === id ? track : item)));
    });
  }

  async createOneShotGroup(name: string): Promise<void> {
    await this.run(async () => {
      const group = await this.api.createOneShotGroup(name);
      this.oneShotGroups.update((groups) => [...groups, group]);
    });
  }

  async renameOneShotGroup(id: string, name: string): Promise<void> {
    await this.run(async () => {
      const group = await this.api.renameOneShotGroup(id, name);
      this.oneShotGroups.update((groups) => groups.map((item) => (item.id === id ? group : item)));
    });
  }

  async deleteOneShotGroup(id: string): Promise<void> {
    await this.run(async () => {
      await this.api.deleteOneShotGroup(id);
      this.oneShotGroups.update((groups) => groups.filter((group) => group.id !== id));
      this.tracks.update((tracks) => tracks.map((track) => ({
        ...track,
        groupIds: (track.groupIds ?? []).filter((groupId) => groupId !== id),
      })));
    });
  }

  async remove(id: string): Promise<void> {
    await this.run(async () => {
      await this.api.deleteTrack(id);
      this.tracks.update((tracks) => tracks.filter((item) => item.id !== id));
      this.bindings.update((bindings) => bindings.filter((item) => item.trackId !== id));
    });
  }

  async bind(slideId: string, input: BindingInput): Promise<void> {
    await this.run(async () => {
      const binding = await this.api.putBinding(slideId, input);
      this.bindings.update((bindings) => [...bindings.filter((item) => item.slideId !== slideId), binding]);
    });
  }

  async unbind(slideId: string): Promise<void> {
    await this.run(async () => {
      await this.api.deleteBinding(slideId);
      this.bindings.update((bindings) => bindings.filter((item) => item.slideId !== slideId));
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await action();
    } catch {
      this.error.set('Request failed. Check the connection and try again.');
    }
  }
}
