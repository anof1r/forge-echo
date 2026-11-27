import { Injectable } from '@angular/core';
import { AudioBackend, PlaybackProgress, PlayRequest, VoiceHandle } from './audio-backend';
import { AudioElementPool } from './audio-element-pool';
import { fadeCurve } from './fade-curve';

// A header-only WAV: enough to count as a user-initiated play on iOS without making a sound.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const POOL_SIZE = 4;

interface Slot {
  element: HTMLAudioElement;
  gain: GainNode;
}

interface ActiveVoice {
  recover(): void;
}

// Web Audio is used for gain because iOS ignores HTMLMediaElement.volume.
// Media elements stream the file with HTTP Range requests, so long tracks are never fully downloaded up front.
@Injectable()
export class WebAudioBackend extends AudioBackend {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVolume = 1;
  private pool: AudioElementPool<Slot> | null = null;
  private readonly voices = new Set<ActiveVoice>();
  private interrupted = false;

  async resume(): Promise<void> {
    const context = this.ensureContext();
    this.pool?.prepare();
    if (context.state !== 'running') await context.resume();
    this.interrupted = false;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  play(request: PlayRequest, onEnded: () => void, onProgress?: (progress: PlaybackProgress) => void): VoiceHandle {
    const context = this.ensureContext();
    const slot = (this.pool as AudioElementPool<Slot>).acquire();
    const { element, gain } = slot;
    const listeners = new AbortController();
    const options = { signal: listeners.signal };

    gain.gain.cancelScheduledValues(0);
    gain.gain.value = request.fadeInMs > 0 ? 0 : request.volume;
    const pitchShifted = (request.pitchSemitones ?? 0) !== 0;
    const playbackRate = 2 ** ((request.pitchSemitones ?? 0) / 12);
    element.playbackRate = 1;
    element.preservesPitch = true;
    element.src = request.url;
    if (pitchShifted) {
      element.preservesPitch = false;
      element.playbackRate = playbackRate;
    }

    let finished = false;
    let stopping = false;
    let paused = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const voice: ActiveVoice = { recover: () => recover() };

    const finish = (): void => {
      if (finished) return;
      finished = true;
      listeners.abort();
      if (timer) clearInterval(timer);
      this.voices.delete(voice);
      element.pause();
      element.playbackRate = 1;
      element.preservesPitch = true;
      element.removeAttribute('src');
      element.load();
      this.pool?.release(slot);
      onEnded();
    };

    const restartOrFinish = (): void => {
      if (!request.loop) return finish();
      element.currentTime = request.startMs / 1000;
      void element.play();
    };

    // After the screen was locked the element stalls and crackles, so reload it at the same position.
    const recover = (): void => {
      if (finished) return;
      const position = element.currentTime;
      element.addEventListener(
        'loadedmetadata',
        () => {
          element.currentTime = Math.max(position, request.startMs / 1000);
          void element.play();
        },
        { once: true, ...options },
      );
      element.src = request.url;
      if (!stopping) {
        gain.gain.cancelScheduledValues(0);
        gain.gain.value = request.volume;
      }
    };

    element.addEventListener(
      'loadedmetadata',
      () => {
        if (request.startMs > 0) element.currentTime = request.startMs / 1000;
        if (pitchShifted) {
          element.preservesPitch = false;
          element.playbackRate = playbackRate;
        }
      },
      { once: true, ...options },
    );
    element.addEventListener('ended', restartOrFinish, options);
    element.addEventListener('error', finish, options);
    if (request.endMs !== null || onProgress) {
      const endSeconds = request.endMs === null ? null : request.endMs / 1000;
      let lastProgressAt = 0;
      timer = setInterval(() => {
        if (endSeconds !== null && element.currentTime >= endSeconds) restartOrFinish();
        if (!onProgress || finished || !Number.isFinite(element.currentTime)) return;
        const now = Date.now();
        if (now - lastProgressAt < 250) return;
        lastProgressAt = now;
        const totalEndMs = request.endMs ?? (Number.isFinite(element.duration) ? element.duration * 1000 : null);
        if (totalEndMs === null || totalEndMs <= request.startMs) return;
        const durationMs = totalEndMs - request.startMs;
        const positionMs = Math.min(durationMs, Math.max(0, element.currentTime * 1000 - request.startMs));
        onProgress({ positionMs, durationMs });
      }, 50);
    }

    this.voices.add(voice);
    void element.play().then(() => {
      this.announce();
      if (finished || request.fadeInMs <= 0) return;
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueCurveAtTime(fadeCurve('in', request.volume), now, request.fadeInMs / 1000);
    }, finish);

    return {
      pause: (): void => {
        if (finished || paused || stopping) return;
        paused = true;
        element.pause();
        if (typeof navigator !== 'undefined' && navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
      },
      resume: (): void => {
        if (finished || !paused || stopping) return;
        paused = false;
        void element.play().then(() => this.announce(), finish);
      },
      stop: (fadeOutMs: number): void => {
        if (finished) return;
        if (fadeOutMs <= 0) return finish();
        stopping = true;
        const now = context.currentTime;
        const current = gain.gain.value;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueCurveAtTime(fadeCurve('out', current), now, fadeOutMs / 1000);
        setTimeout(finish, fadeOutMs + 50);
      },
    };
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      this.master = context.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(context.destination);
      this.pool = new AudioElementPool<Slot>(
        () => this.createSlot(context),
        (slot) => this.unlockSlot(slot),
        POOL_SIZE,
      );
      context.addEventListener('statechange', () => {
        if (context.state === 'running') return this.recoverVoices();
        this.interrupted = true;
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.interrupted = true;
        else void this.wake();
      });
    }
    return this.context;
  }

  private createSlot(context: AudioContext): Slot {
    const element = new Audio();
    element.crossOrigin = 'anonymous';
    element.preload = 'auto';
    const gain = context.createGain();
    context.createMediaElementSource(element).connect(gain).connect(this.master as GainNode);
    return { element, gain };
  }

  private unlockSlot(slot: Slot): void {
    slot.element.src = SILENT_WAV;
    void slot.element.play().then(
      () => slot.element.pause(),
      () => undefined,
    );
  }

  private async wake(): Promise<void> {
    const context = this.context;
    if (!context) return;
    if (context.state !== 'running') await context.resume().catch(() => undefined);
    this.recoverVoices();
  }

  private recoverVoices(): void {
    if (!this.interrupted || document.hidden) return;
    this.interrupted = false;
    this.voices.forEach((voice) => voice.recover());
  }

  private announce(): void {
    const session = typeof navigator === 'undefined' ? undefined : navigator.mediaSession;
    if (!session) return;
    session.metadata = new MediaMetadata({ title: 'Forge Echo', artist: 'Ambient' });
    session.playbackState = 'playing';
  }
}
