import { BATTLE_BINDING_KEY, Binding, Presentation, Track } from './models';

export interface PlannerInput {
  presentation: Presentation;
  bindings: readonly Binding[];
  tracks: readonly Track[];
  currentTrackId: string | null;
  manual: boolean;
}

export type PlaybackAction =
  | { type: 'none' }
  | { type: 'play'; trackId: string; fadeInMs: number; fadeOutMs: number; volume: number };

const NONE: PlaybackAction = { type: 'none' };

export function planPlayback(input: PlannerInput): PlaybackAction {
  if (input.manual) return NONE;

  const key = input.presentation.mode === 'battle' ? BATTLE_BINDING_KEY : input.presentation.activeSlideId;
  if (!key) return NONE;

  const binding = input.bindings.find((candidate) => candidate.slideId === key);
  if (!binding) return NONE;
  if (!input.tracks.some((track) => track.id === binding.trackId)) return NONE;
  if (binding.trackId === input.currentTrackId) return NONE;

  return {
    type: 'play',
    trackId: binding.trackId,
    fadeInMs: binding.fadeInMs,
    fadeOutMs: binding.fadeOutMs,
    volume: binding.volume,
  };
}
