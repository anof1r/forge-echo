import { AfterViewInit, Component, ElementRef, OnDestroy, inject, input, output, signal, viewChild } from '@angular/core';
import { WaveformFactory, WaveformView } from './waveform';

export interface TrimChange {
  startMs: number;
  endMs: number | null;
}

// A region that stays within this distance of the end counts as "play to the end of the file".
const END_TOLERANCE_SECONDS = 0.05;

@Component({
  selector: 'app-trim-editor',
  templateUrl: './trim-editor.html',
  styleUrl: './trim-editor.scss',
})
export class TrimEditor implements AfterViewInit, OnDestroy {
  readonly url = input.required<string>();
  readonly startMs = input(0);
  readonly endMs = input<number | null>(null);
  readonly trimChange = output<TrimChange>();

  protected readonly container = viewChild.required<ElementRef<HTMLElement>>('wave');
  protected readonly playing = signal(false);
  protected readonly failed = signal(false);

  private readonly factory = inject(WaveformFactory);
  private view: WaveformView | null = null;
  private duration = 0;

  ngAfterViewInit(): void {
    const end = this.endMs();
    this.view = this.factory.create(
      this.container().nativeElement,
      this.url(),
      { start: this.startMs() / 1000, end: end === null ? null : end / 1000 },
      {
        ready: (duration) => (this.duration = duration),
        trimChanged: (start, endSeconds) => {
          const toEnd = this.duration > 0 && endSeconds >= this.duration - END_TOLERANCE_SECONDS;
          this.trimChange.emit({ startMs: Math.round(start * 1000), endMs: toEnd ? null : Math.round(endSeconds * 1000) });
        },
        finished: () => this.playing.set(false),
        failed: () => this.failed.set(true),
      },
    );
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }

  protected togglePreview(): void {
    if (this.playing()) {
      this.view?.stop();
      this.playing.set(false);
      return;
    }
    this.playing.set(true);
    this.view?.playTrim();
  }
}
