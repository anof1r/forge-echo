import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Binding, BindingInput, OneShotGroup, Slide, Track, TrackKind, TrackPatch } from './models';

@Injectable({ providedIn: 'root' })
export class ForgeApi {
  private readonly http = inject(HttpClient);

  async listTracks(): Promise<Track[]> {
    return (await firstValueFrom(this.http.get<{ tracks: Track[] }>('/api/tracks'))).tracks;
  }

  async uploadTrack(file: File, kind: TrackKind, name?: string): Promise<Track> {
    const form = new FormData();
    form.set('kind', kind);
    if (name) form.set('name', name);
    form.set('file', file);
    return (await firstValueFrom(this.http.post<{ track: Track }>('/api/tracks', form))).track;
  }

  async patchTrack(id: string, patch: TrackPatch): Promise<Track> {
    return (await firstValueFrom(this.http.patch<{ track: Track }>(`/api/tracks/${id}`, patch))).track;
  }

  async deleteTrack(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/tracks/${id}`));
  }

  async uploadArtwork(trackId: string, file: File): Promise<Track> {
    const form = new FormData();
    form.set('file', file);
    return (await firstValueFrom(this.http.post<{ track: Track }>(`/api/tracks/${trackId}/artwork`, form))).track;
  }

  async listOneShotGroups(): Promise<OneShotGroup[]> {
    return (await firstValueFrom(this.http.get<{ groups: OneShotGroup[] }>('/api/oneshot-groups'))).groups;
  }

  async createOneShotGroup(name: string): Promise<OneShotGroup> {
    return (await firstValueFrom(this.http.post<{ group: OneShotGroup }>('/api/oneshot-groups', { name }))).group;
  }

  async renameOneShotGroup(id: string, name: string): Promise<OneShotGroup> {
    return (await firstValueFrom(this.http.patch<{ group: OneShotGroup }>(`/api/oneshot-groups/${id}`, { name }))).group;
  }

  async deleteOneShotGroup(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/oneshot-groups/${id}`));
  }

  async listBindings(): Promise<Binding[]> {
    return (await firstValueFrom(this.http.get<{ bindings: Binding[] }>('/api/bindings'))).bindings;
  }

  async putBinding(slideId: string, input: BindingInput): Promise<Binding> {
    return (await firstValueFrom(this.http.put<{ binding: Binding }>(`/api/bindings/${slideId}`, input))).binding;
  }

  async deleteBinding(slideId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/bindings/${slideId}`));
  }

  streamUrl(trackId: string): string {
    return `/api/tracks/${trackId}/stream`;
  }

  artworkUrl(track: Track): string | null {
    return track.imageFile ? `/api/tracks/${track.id}/artwork?v=${track.updatedAt}` : null;
  }

  slideImageUrl(slide: Slide): string {
    const file = slide.mediaPath.split('?')[0].split('/').pop() ?? '';
    const version = slide.mediaPath.includes('?') ? `?${slide.mediaPath.split('?')[1]}` : '';
    return `/api/battle-forge/slides/${file}${version}`;
  }
}
