export type TrackKind = 'ambient' | 'oneshot';
export const TRACK_KINDS: readonly TrackKind[] = ['ambient', 'oneshot'];

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

export type BindingInput = Pick<Binding, 'trackId' | 'fadeInMs' | 'fadeOutMs' | 'volume'>;
