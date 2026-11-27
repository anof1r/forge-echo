export interface PlayRequest {
  url: string;
  startMs: number;
  endMs: number | null;
  loop: boolean;
  volume: number;
  fadeInMs: number;
  pitchSemitones?: number;
}

export interface PlaybackProgress {
  positionMs: number;
  durationMs: number;
}

export interface VoiceHandle {
  stop(fadeOutMs: number): void;
  pause(): void;
  resume(): void;
}

// Abstraction over the browser audio stack so playback rules can be tested without a browser.
export abstract class AudioBackend {
  abstract resume(): Promise<void>;
  abstract setMasterVolume(volume: number): void;
  abstract play(request: PlayRequest, onEnded: () => void, onProgress?: (progress: PlaybackProgress) => void): VoiceHandle;
}
