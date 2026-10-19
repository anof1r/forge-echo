import { describe, expect, it } from 'vitest';
import {
  parseContractVersion,
  BATTLE_FORGE_PRESENTATION_PATH,
  BATTLE_FORGE_SLIDES_PATH,
  parsePresentation,
  parseSlides,
} from './battle-forge.contract';

function rawSlide(id: string, order: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `${id}.png`,
    sectionId: id,
    order,
    media: { key: `slides/${id}.webp`, version: 3 },
    createdAt: 1,
    lastUpdated: 2,
    ...overrides,
  };
}

describe('battle forge contract paths', () => {
  it('uses the data paths published by Battle Forge', () => {
    // Arrange - constants under test

    // Act
    const paths = [BATTLE_FORGE_SLIDES_PATH, BATTLE_FORGE_PRESENTATION_PATH];

    // Assert
    expect(paths).toEqual(['dm-library/slides', 'settings/presentation']);
  });
});

describe('parseSlides', () => {
  it('returns slides ordered by their order field', () => {
    // Arrange
    const raw = { b: rawSlide('b', 2), a: rawSlide('a', 1), c: rawSlide('c', 3) };

    // Act
    const slides = parseSlides(raw);

    // Assert
    expect(slides.map((slide) => slide.id)).toEqual(['a', 'b', 'c']);
  });

  it('exposes only the fields the soundboard needs', () => {
    // Arrange
    const raw = { a: rawSlide('a', 1, { name: 'Tavern.png' }) };

    // Act
    const [slide] = parseSlides(raw);

    // Assert
    expect(slide).toEqual({
      id: 'a',
      name: 'Tavern.png',
      order: 1,
      mediaPath: '/media/slides/a.webp?v=3',
    });
  });

  it('returns an empty list when the collection is missing', () => {
    // Arrange
    const raw = null;

    // Act
    const slides = parseSlides(raw);

    // Assert
    expect(slides).toEqual([]);
  });

  it.each([
    ['a non-object collection', 'nope'],
    ['an array', [rawSlide('a', 1)]],
    ['a number', 42],
  ])('returns an empty list for %s', (_label, raw) => {
    // Arrange - raw value from the table

    // Act
    const slides = parseSlides(raw);

    // Assert
    expect(slides).toEqual([]);
  });

  it.each([
    ['an empty id', { x: rawSlide('', 1) }],
    ['a missing media object', { x: rawSlide('x', 1, { media: undefined }) }],
    ['a media key outside the slides directory', { x: rawSlide('x', 1, { media: { key: '../etc/passwd', version: 1 } }) }],
    ['a media key from another directory', { x: rawSlide('x', 1, { media: { key: 'avatars/players/x.webp', version: 1 } }) }],
    ['a non-numeric order', { x: rawSlide('x', 1, { order: 'first' }) }],
    ['a non-object record', { x: 'broken' }],
  ])('skips a record with %s', (_label, raw) => {
    // Arrange - raw value from the table

    // Act
    const slides = parseSlides(raw);

    // Assert
    expect(slides).toEqual([]);
  });

  it('keeps valid records when a neighbour is broken', () => {
    // Arrange
    const raw = { a0: rawSlide('a0', 1), bad: { id: 'bad' } };

    // Act
    const slides = parseSlides(raw);

    // Assert
    expect(slides.map((slide) => slide.id)).toEqual(['a0']);
  });

  it('falls back to the record key when the id field is missing', () => {
    // Arrange
    const raw = { ab: rawSlide('ab', 1, { id: undefined }) };

    // Act
    const slides = parseSlides(raw);

    // Assert
    expect(slides.map((slide) => slide.id)).toEqual(['ab']);
  });

  it('uses a default version of 1 when the version is missing', () => {
    // Arrange
    const raw = { a: rawSlide('a', 1, { media: { key: 'slides/a.webp' } }) };

    // Act
    const [slide] = parseSlides(raw);

    // Assert
    expect(slide.mediaPath).toBe('/media/slides/a.webp?v=1');
  });
});

describe('parsePresentation', () => {
  it('reads the mode and the active slide', () => {
    // Arrange
    const raw = { mode: 'story', activeSlideId: 'a', lastUpdated: 5 };

    // Act
    const presentation = parsePresentation(raw);

    // Assert
    expect(presentation).toEqual({ mode: 'story', activeSlideId: 'a' });
  });

  it('defaults to battle mode without an active slide when nothing is published', () => {
    // Arrange
    const raw = null;

    // Act
    const presentation = parsePresentation(raw);

    // Assert
    expect(presentation).toEqual({ mode: 'battle', activeSlideId: null });
  });

  it('treats an unknown mode as battle', () => {
    // Arrange
    const raw = { mode: 'cinema', activeSlideId: 'a' };

    // Act
    const presentation = parsePresentation(raw);

    // Assert
    expect(presentation.mode).toBe('battle');
  });

  it.each([
    ['a number', 7],
    ['an empty string', ''],
    ['null', null],
    ['a missing value', undefined],
  ])('treats %s as no active slide', (_label, activeSlideId) => {
    // Arrange
    const raw = { mode: 'story', activeSlideId };

    // Act
    const presentation = parsePresentation(raw);

    // Assert
    expect(presentation.activeSlideId).toBeNull();
  });

  it('ignores non-object payloads', () => {
    // Arrange
    const raw = 'story';

    // Act
    const presentation = parsePresentation(raw);

    // Assert
    expect(presentation).toEqual({ mode: 'battle', activeSlideId: null });
  });
});

describe('parseContractVersion', () => {
  it('reads the forge echo contract version from the health body', () => {
    // Arrange
    const body = { status: 'ok', contracts: { forgeEcho: 1 } };

    // Act
    const version = parseContractVersion(body);

    // Assert
    expect(version).toBe(1);
  });

  it.each([null, 'text', {}, { contracts: null }, { contracts: { forgeEcho: '1' } }, { contracts: { forgeEcho: 1.5 } }])(
    'returns null for %j',
    (body) => {
      // Arrange - body comes from the table

      // Act
      const version = parseContractVersion(body);

      // Assert
      expect(version).toBeNull();
    },
  );
});
