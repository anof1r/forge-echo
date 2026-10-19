import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AudioBackend, VoiceHandle } from './audio-backend';
import { ForgeApi } from './forge-api';
import { LibraryStore } from './library-store';
import { Track } from './models';
import { planPlayback } from './playback-planner';
import { StageStateService } from './stage-state.service';

const MANUAL_FADE_MS = 1500;

@Injectable({ providedIn: 'root' })
export class PlaybackService {
  private readonly backend = inject(AudioBackend);
  private readonly api = inject(ForgeApi);
  private readonly library = inject(LibraryStore);
  private readonly stage = inject(StageStateService);

  readonly started = signal(false);
  readonly manual = signal(false);
  readonly masterVolume = signal(1);
  readonly nowPlaying = signal<Track | null>(null);

  private voice: VoiceHandle | null = null;
  private generation = 0;

  constructor() {
    effect(() => {
      if (!this.started()) return;
      const action = planPlayback({
        presentation: this.stage.state().presentation,
        bindings: this.library.bindings(),
        tracks: this.library.tracks(),
        currentTrackId: untracked(() => this.nowPlaying()?.id ?? null),
        manual: this.manual(),
      });
      if (action.type !== 'play') return;
      const track = this.library.tracks().find((item) => item.id === action.trackId);
      if (track) this.playAmbient(track, action.fadeInMs, action.fadeOutMs, action.volume);
    });
  }

  async startSession(): Promise<void> {
    await this.backend.resume();
    this.started.set(true);
  }

  playManual(track: Track): void {
    this.manual.set(true);
    this.playAmbient(track, MANUAL_FADE_MS, MANUAL_FADE_MS, 1);
  }

  hold(): void {
    this.manual.set(true);
  }

  backToAuto(): void {
    this.manual.set(false);
  }

  stopAmbient(): void {
    this.voice?.stop(MANUAL_FADE_MS);
    this.voice = null;
    this.generation += 1;
    this.nowPlaying.set(null);
    this.manual.set(true);
  }

  playOneShot(track: Track): void {
    if (!this.started()) return;
    this.backend.play(
      {
        url: this.api.streamUrl(track.id),
        startMs: track.startMs,
        endMs: track.endMs,
        loop: false,
        volume: track.volume,
        fadeInMs: 0,
      },
      () => undefined,
    );
  }

  setMasterVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    this.masterVolume.set(clamped);
    this.backend.setMasterVolume(clamped);
  }

  private playAmbient(track: Track, fadeInMs: number, fadeOutMs: number, bindingVolume: number): void {
    this.voice?.stop(fadeOutMs);
    const generation = ++this.generation;
    this.voice = this.backend.play(
      {
        url: this.api.streamUrl(track.id),
        startMs: track.startMs,
        endMs: track.endMs,
        loop: track.loop,
        volume: track.volume * bindingVolume,
        fadeInMs,
      },
      () => {
        if (generation !== this.generation) return;
        this.voice = null;
        this.nowPlaying.set(null);
      },
    );
    this.nowPlaying.set(track);
  }
}
