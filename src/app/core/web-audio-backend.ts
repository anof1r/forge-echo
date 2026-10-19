import { Injectable } from '@angular/core';
import { AudioBackend, PlayRequest, VoiceHandle } from './audio-backend';

// Web Audio is used for gain because iOS ignores HTMLMediaElement.volume.
// Media elements stream the file with HTTP Range requests, so long tracks are never fully downloaded up front.
@Injectable()
export class WebAudioBackend extends AudioBackend {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVolume = 1;

  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context.state !== 'running') await context.resume();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  play(request: PlayRequest, onEnded: () => void): VoiceHandle {
    const context = this.ensureContext();
    const element = new Audio();
    element.crossOrigin = 'anonymous';
    element.preload = 'auto';
    element.src = request.url;

    const gain = context.createGain();
    gain.gain.value = request.fadeInMs > 0 ? 0 : request.volume;
    context.createMediaElementSource(element).connect(gain).connect(this.master as GainNode);

    let finished = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      element.pause();
      element.removeAttribute('src');
      element.load();
      gain.disconnect();
      onEnded();
    };

    const restartOrFinish = (): void => {
      if (!request.loop) return finish();
      element.currentTime = request.startMs / 1000;
      void element.play();
    };

    element.addEventListener('loadedmetadata', () => {
      if (request.startMs > 0) element.currentTime = request.startMs / 1000;
    });
    element.addEventListener('ended', restartOrFinish);
    element.addEventListener('error', finish);
    if (request.endMs !== null) {
      const endSeconds = request.endMs / 1000;
      timer = setInterval(() => {
        if (element.currentTime >= endSeconds) restartOrFinish();
      }, 50);
    }

    void element.play().then(() => {
      if (finished || request.fadeInMs <= 0) return;
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(request.volume, now + request.fadeInMs / 1000);
    }, finish);

    return {
      stop: (fadeOutMs: number): void => {
        if (finished) return;
        if (fadeOutMs <= 0) return finish();
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeOutMs / 1000);
        setTimeout(finish, fadeOutMs + 50);
      },
    };
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.context.destination);
    }
    return this.context;
  }
}
