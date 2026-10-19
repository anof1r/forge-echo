export type TrackKind = 'ambient' | 'oneshot';

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  file: string;
  mimeType: string;
  sizeBytes: number;
  startMs: number;
  endMs: number | null;
  volume: number;
  loop: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TrackPatch = Partial<Pick<Track, 'name' | 'kind' | 'startMs' | 'endMs' | 'volume' | 'loop'>>;

export interface Binding {
  slideId: string;
  trackId: string;
  fadeInMs: number;
  fadeOutMs: number;
  volume: number;
  updatedAt: number;
}

export type BindingInput = Pick<Binding, 'trackId'> & Partial<Pick<Binding, 'fadeInMs' | 'fadeOutMs' | 'volume'>>;

export interface Slide {
  id: string;
  name: string;
  order: number;
  mediaPath: string;
}

export interface Presentation {
  mode: 'battle' | 'story';
  activeSlideId: string | null;
}

export interface StageState {
  connection: 'connected' | 'disconnected';
  contract: 'unknown' | 'compatible' | 'incompatible';
  presentation: Presentation;
  slides: Slide[];
}

// Bindings are keyed by slide id; the battle screen has its own reserved key.
export const BATTLE_BINDING_KEY = 'battle';
