import { Component, computed, inject } from '@angular/core';
import { ForgeApi } from '../../core/forge-api';
import { LibraryStore } from '../../core/library-store';
import { Track } from '../../core/models';
import { PlaybackService } from '../../core/playback.service';
import { StageStateService } from '../../core/stage-state.service';
import { Icon } from '../../ui/icon';
import { IconButton } from '../../ui/icon-button';
import { IntensitySlider } from '../../ui/intensity-slider';
import { ModeToggle, ToggleOption } from '../../ui/mode-toggle';

@Component({
  selector: 'app-stage-page',
  imports: [Icon, IconButton, IntensitySlider, ModeToggle],
  templateUrl: './stage-page.html',
  styleUrl: './stage-page.scss',
})
export class StagePage {
  protected readonly playback = inject(PlaybackService);
  private readonly library = inject(LibraryStore);
  protected readonly stage = inject(StageStateService);
  private readonly api = inject(ForgeApi);

  protected readonly modes: ToggleOption[] = [
    { value: 'auto', label: 'Follow scenes' },
    { value: 'manual', label: 'Hold' },
  ];

  protected readonly ambient = computed(() => this.library.tracks().filter((track) => track.kind === 'ambient'));
  protected readonly oneShots = computed(() => this.library.tracks().filter((track) => track.kind === 'oneshot'));
  protected readonly battleForgeOnline = computed(() => this.stage.state().connection === 'connected');
  protected readonly currentSlide = computed(() => {
    const { presentation, slides } = this.stage.state();
    const slide = slides.find((item) => item.id === presentation.activeSlideId);
    return slide ? { name: slide.name, imageUrl: this.api.slideImageUrl(slide) } : null;
  });

  constructor() {
    void this.library.refresh();
  }

  protected setMode(mode: string): void {
    if (mode === 'auto') this.playback.backToAuto();
    else this.playback.hold();
  }

  protected playAmbient(track: Track): void {
    this.playback.playManual(track);
  }
}
