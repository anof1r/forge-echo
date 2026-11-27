import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AudioBackend, PlaybackProgress, VoiceHandle } from './audio-backend';
import { ForgeApi } from '../data/forge-api';
import { LibraryStore } from '../data/library-store';
import { Track } from '../data/models';
import { planPlayback } from './playback-planner';
import { OneShotPitchMemory, nextOneShotPitch } from './one-shot-pitch';
import { perceivedVolumeGain } from './perceived-volume';
import { StageStateService } from '../data/stage-state.service';

const MANUAL_FADE_MS = 4000;

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
  readonly nowPlayingProgress = signal<PlaybackProgress | null>(null);
  readonly paused = signal(false);

  private voice: VoiceHandle | null = null;
  private generation = 0;
  private readonly oneShotPitchMemory = new Map<string, OneShotPitchMemory>();

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
      if (track) {
        this.paused.set(false);
        this.playAmbient(track, action.fadeInMs, action.fadeOutMs, action.volume);
      }
    });
  }

  async startSession(): Promise<void> {
    await this.backend.resume();
    this.started.set(true);
  }

  playManual(track: Track): void {
    this.manual.set(true);
    this.paused.set(false);
    this.playAmbient(track, MANUAL_FADE_MS, MANUAL_FADE_MS, 1);
  }

  togglePause(): void {
    if (this.paused()) {
      this.voice?.resume();
      this.paused.set(false);
      return;
    }
    if (this.voice && this.nowPlaying()) {
      this.voice.pause();
      this.paused.set(true);
      return;
    }
    this.paused.set(false);
    this.backToAuto();
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
    this.nowPlayingProgress.set(null);
    this.paused.set(false);
    this.manual.set(true);
  }

  playOneShot(track: Track): void {
    if (!this.started()) return;
    const now = Date.now();
    const pitchSemitones = nextOneShotPitch(this.oneShotPitchMemory.get(track.id) ?? null, now);
    this.oneShotPitchMemory.set(track.id, { at: now, semitones: pitchSemitones });
    this.backend.play(
      {
        url: this.api.streamUrl(track.id),
        startMs: track.startMs,
        endMs: track.endMs,
        loop: false,
        volume: track.volume,
        fadeInMs: 0,
        pitchSemitones,
      },
      () => undefined,
    );
  }

  setMasterVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    this.masterVolume.set(clamped);
    this.backend.setMasterVolume(perceivedVolumeGain(clamped));
  }

  private playAmbient(track: Track, fadeInMs: number, fadeOutMs: number, bindingVolume: number): void {
    this.voice?.stop(fadeOutMs);
    const generation = ++this.generation;
    this.nowPlayingProgress.set(null);
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
        this.nowPlayingProgress.set(null);
      },
      (progress) => {
        if (generation === this.generation) this.nowPlayingProgress.set(progress);
      },
    );
    this.nowPlaying.set(track);
  }
}
