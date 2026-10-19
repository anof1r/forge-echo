import { Component, computed, inject, signal } from '@angular/core';
import { ForgeApi } from '../../core/forge-api';
import { LibraryStore } from '../../core/library-store';
import { BATTLE_BINDING_KEY, Binding, Track, TrackKind } from '../../core/models';
import { StageStateService } from '../../core/stage-state.service';

interface BindingTarget {
  key: string;
  name: string;
  imageUrl: string | null;
}

const MAX_FADE_SECONDS = 30;

@Component({
  selector: 'app-library-page',
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPage {
  protected readonly store = inject(LibraryStore);
  protected readonly api = inject(ForgeApi);
  private readonly stage = inject(StageStateService);

  protected readonly uploadKind = signal<TrackKind>('ambient');
  protected readonly pendingDelete = signal<string | null>(null);

  protected readonly ambientTracks = computed(() => this.store.tracks().filter((track) => track.kind === 'ambient'));
  protected readonly targets = computed<BindingTarget[]>(() => [
    { key: BATTLE_BINDING_KEY, name: 'Battle screen', imageUrl: null },
    ...this.stage.state().slides.map((slide) => ({
      key: slide.id,
      name: slide.name,
      imageUrl: this.api.slideImageUrl(slide),
    })),
  ]);

  constructor() {
    void this.store.refresh();
  }

  protected setUploadKind(event: Event): void {
    this.uploadKind.set((event.target as HTMLSelectElement).value === 'oneshot' ? 'oneshot' : 'ambient');
  }

  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) await this.store.upload(file, this.uploadKind());
  }

  protected rename(track: Track, event: Event): void {
    const input = event.target as HTMLInputElement;
    const name = input.value.trim();
    if (!name || name.length > 80) {
      input.value = track.name;
      return;
    }
    if (name !== track.name) void this.store.patch(track.id, { name });
  }

  protected setVolume(track: Track, event: Event): void {
    const percent = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(percent)) void this.store.patch(track.id, { volume: Math.min(1, Math.max(0, percent / 100)) });
  }

  protected setLoop(track: Track, event: Event): void {
    void this.store.patch(track.id, { loop: (event.target as HTMLInputElement).checked });
  }

  protected useCurrentPosition(input: HTMLInputElement, audio: HTMLAudioElement): void {
    input.value = audio.currentTime.toFixed(2);
  }

  protected saveTrim(track: Track, start: string, end: string): void {
    const startSeconds = start.trim() === '' ? 0 : Number(start);
    const endSeconds = end.trim() === '' ? null : Number(end);
    const valid =
      Number.isFinite(startSeconds) &&
      startSeconds >= 0 &&
      (endSeconds === null || (Number.isFinite(endSeconds) && endSeconds > startSeconds));
    if (!valid) return;
    void this.store.patch(track.id, {
      startMs: Math.round(startSeconds * 1000),
      endMs: endSeconds === null ? null : Math.round(endSeconds * 1000),
    });
  }

  protected requestDelete(track: Track): void {
    if (this.pendingDelete() === track.id) {
      this.pendingDelete.set(null);
      void this.store.remove(track.id);
      return;
    }
    this.pendingDelete.set(track.id);
  }

  protected bindingFor(key: string): Binding | undefined {
    return this.store.bindings().find((binding) => binding.slideId === key);
  }

  protected changeBinding(key: string, event: Event): void {
    const trackId = (event.target as HTMLSelectElement).value;
    if (!trackId) {
      void this.store.unbind(key);
      return;
    }
    const existing = this.bindingFor(key);
    void this.store.bind(
      key,
      existing
        ? { trackId, fadeInMs: existing.fadeInMs, fadeOutMs: existing.fadeOutMs, volume: existing.volume }
        : { trackId },
    );
  }

  protected changeFade(key: string, which: 'fadeInMs' | 'fadeOutMs', event: Event): void {
    const existing = this.bindingFor(key);
    const seconds = Number((event.target as HTMLInputElement).value);
    if (!existing || !Number.isFinite(seconds) || seconds < 0 || seconds > MAX_FADE_SECONDS) return;
    void this.store.bind(key, {
      trackId: existing.trackId,
      fadeInMs: existing.fadeInMs,
      fadeOutMs: existing.fadeOutMs,
      volume: existing.volume,
      [which]: Math.round(seconds * 1000),
    });
  }
}
