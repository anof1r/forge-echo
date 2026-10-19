/**
 * The only knowledge forge-echo has about Battle Forge data.
 *
 * Battle Forge is the owner of these records. forge-echo reads them through
 * Socket.IO subscriptions and never writes them back. Everything coming from
 * the other side is untrusted: parsers drop what they cannot understand and
 * never throw, so a malformed record cannot break the soundboard.
 */
export const BATTLE_FORGE_SLIDES_PATH = 'dm-library/slides';
export const BATTLE_FORGE_PRESENTATION_PATH = 'settings/presentation';

const SLIDE_MEDIA_KEY = /^slides\/[0-9a-f-]+\.webp$/i;

export type PresentationMode = 'battle' | 'story';

export interface BattleForgeSlide {
  id: string;
  name: string;
  order: number;
  /** Path relative to the Battle Forge origin, for example /media/slides/abc.webp?v=3. */
  mediaPath: string;
}

export interface BattleForgePresentation {
  mode: PresentationMode;
  activeSlideId: string | null;
}

export function parseSlides(raw: unknown): BattleForgeSlide[] {
  if (!isRecord(raw)) return [];

  const slides: BattleForgeSlide[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const slide = parseSlide(key, value);
    if (slide) slides.push(slide);
  }
  return slides.sort((left, right) => left.order - right.order);
}

export function parsePresentation(raw: unknown): BattleForgePresentation {
  if (!isRecord(raw)) return { mode: 'battle', activeSlideId: null };

  const activeSlideId = raw['activeSlideId'];
  return {
    mode: raw['mode'] === 'story' ? 'story' : 'battle',
    activeSlideId: typeof activeSlideId === 'string' && activeSlideId ? activeSlideId : null,
  };
}

function parseSlide(key: string, value: unknown): BattleForgeSlide | null {
  if (!isRecord(value)) return null;

  const id = typeof value['id'] === 'string' ? value['id'] : key;
  const media = value['media'];
  const order = value['order'];
  if (!id || !isRecord(media) || typeof order !== 'number' || !Number.isFinite(order)) return null;

  const mediaKey = media['key'];
  if (typeof mediaKey !== 'string' || !SLIDE_MEDIA_KEY.test(mediaKey)) return null;

  const version = media['version'];
  return {
    id,
    name: typeof value['name'] === 'string' ? value['name'] : id,
    order,
    mediaPath: `/media/${mediaKey}?v=${typeof version === 'number' ? version : 1}`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Bumped by Battle Forge whenever the slide or presentation records change shape.
export const SUPPORTED_CONTRACT_VERSION = 1;

export function parseContractVersion(body: unknown): number | null {
  if (body === null || typeof body !== 'object') return null;
  const contracts = (body as { contracts?: unknown }).contracts;
  if (contracts === null || typeof contracts !== 'object') return null;
  const version = (contracts as { forgeEcho?: unknown }).forgeEcho;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}
