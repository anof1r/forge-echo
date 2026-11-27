import { Injectable } from '@angular/core';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

export interface WaveformTrim {
  start: number;
  end: number | null;
}

export interface WaveformHandlers {
  ready(durationSeconds: number): void;
  trimChanged(startSeconds: number, endSeconds: number): void;
  finished(): void;
  failed(): void;
}

export interface WaveformView {
  playTrim(): void;
  stop(): void;
  destroy(): void;
}

// Keeps wavesurfer.js behind a small seam so components can be tested without a real audio engine.
@Injectable({ providedIn: 'root', useFactory: () => new WavesurferFactory() })
export abstract class WaveformFactory {
  abstract create(container: HTMLElement, url: string, trim: WaveformTrim, handlers: WaveformHandlers): WaveformView;
}

export class WavesurferFactory extends WaveformFactory {
  create(container: HTMLElement, url: string, trim: WaveformTrim, handlers: WaveformHandlers): WaveformView {
    const regions = RegionsPlugin.create();
    const surface = WaveSurfer.create({
      container,
      url,
      height: 96,
      waveColor: '#6b5a4b',
      progressColor: '#6b5a4b',
      cursorColor: '#f1e8de',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      plugins: [regions],
    });

    let region: ReturnType<typeof regions.addRegion> | null = null;

    surface.on('ready', (duration) => {
      region = regions.addRegion({
        start: Math.min(trim.start, duration),
        end: trim.end === null ? duration : Math.min(trim.end, duration),
        color: 'rgba(240, 160, 75, 0.28)',
        drag: true,
        resize: true,
      });
      handlers.ready(duration);
    });
    regions.on('region-updated', (updated) => handlers.trimChanged(updated.start, updated.end));
    regions.on('region-out', () => surface.pause());
    surface.on('pause', () => handlers.finished());
    surface.on('error', () => handlers.failed());

    return {
      playTrim: () => region?.play(),
      stop: () => surface.pause(),
      destroy: () => surface.destroy(),
    };
  }
}
