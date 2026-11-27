import { Component, computed, inject, signal } from '@angular/core';
import { ForgeApi } from '../../core/data/forge-api';
import { LibraryStore } from '../../core/data/library-store';
import { OneShotGroup, Track } from '../../core/data/models';
import { PlaybackService } from '../../core/audio/playback.service';
import { StageStateService } from '../../core/data/stage-state.service';
import { Icon } from '../../shared/ui/icon';
import { IntensitySlider } from '../../shared/ui/intensity-slider';
import { ModeToggle, ToggleOption } from '../../shared/ui/mode-toggle';

@Component({
  selector: 'app-stage-page',
  imports: [Icon, IntensitySlider, ModeToggle],
  templateUrl: './stage-page.html',
  styleUrl: './stage-page.scss',
})
export class StagePage {
  protected readonly playback = inject(PlaybackService);
  private readonly library = inject(LibraryStore);
  protected readonly stage = inject(StageStateService);
  private readonly api = inject(ForgeApi);
  private readonly unsortedGroupId = '__ungrouped__';
  protected readonly selectedOneShotGroupId = signal('');

  protected readonly modes: ToggleOption[] = [
    { value: 'auto', label: 'Follow scenes' },
    { value: 'manual', label: 'Hold' },
  ];

  protected readonly ambient = computed(() => this.library.tracks().filter((track) => track.kind === 'ambient'));
  protected readonly oneShots = computed(() => this.library.tracks().filter((track) => track.kind === 'oneshot'));
  protected readonly oneShotGroupOptions = computed<OneShotGroup[]>(() => {
    const groups = this.library.oneShotGroups();
    const hasUngrouped = this.oneShots().some((track) => (track.groupIds ?? []).length === 0);
    return hasUngrouped
      ? [{ id: this.unsortedGroupId, name: 'Unsorted', createdAt: 0, updatedAt: 0 }, ...groups]
      : groups;
  });
  protected readonly activeOneShotGroupId = computed(() => {
    const groups = this.oneShotGroupOptions();
    return groups.some((group) => group.id === this.selectedOneShotGroupId())
      ? this.selectedOneShotGroupId()
      : groups[0]?.id ?? '';
  });
  protected readonly visibleOneShots = computed(() => {
    const groupId = this.activeOneShotGroupId();
    if (!groupId) return [];
    return this.oneShots().filter((track) =>
      groupId === this.unsortedGroupId ? (track.groupIds ?? []).length === 0 : (track.groupIds ?? []).includes(groupId),
    );
  });
  protected readonly battleForgeOnline = computed(() => this.stage.state().connection === 'connected');
  protected readonly currentSlide = computed(() => {
    const { presentation, slides } = this.stage.state();
    const slide = slides.find((item) => item.id === presentation.activeSlideId);
    return slide ? { name: slide.name, imageUrl: this.api.slideImageUrl(slide) } : null;
  });
  protected readonly playbackProgressPercent = computed(() => {
    const progress = this.playback.nowPlayingProgress();
    if (!progress || progress.durationMs <= 0) return 0;
    return Math.round((progress.positionMs / progress.durationMs) * 1000) / 10;
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

  protected setOneShotGroup(groupId: string): void {
    this.selectedOneShotGroupId.set(groupId);
  }

  protected artworkUrl(track: Track): string | null {
    return this.api.artworkUrl(track);
  }

  protected formatPlaybackTime(milliseconds: number): string {
    const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}:${seconds}`;
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${seconds}`;
  }
}
