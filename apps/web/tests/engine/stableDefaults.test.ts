import { describe, expect, it } from 'vitest';
import { createProcessConfigForMode, PATTERN_MODE_CONFIG } from '@pxlbeads/shared';

describe('stable pattern mode defaults', () => {
  it('exposes only the stable generation modes', () => {
    expect(Object.keys(PATTERN_MODE_CONFIG)).toEqual(['pattern', 'subject', 'logo']);
  });

  it('uses full-image pattern mode as the default config', () => {
    const config = createProcessConfigForMode('pattern', 'mard');

    expect(config).toMatchObject({
      width: 80,
      height: 80,
      brand: 'mard',
      maxColors: 40,
      patternMode: 'pattern',
      mode: 'smart',
      beadStyle: 'square',
      floodFillBackground: false,
      dither: false,
      confettiMinRatio: 0,
    });
    expect(config).not.toHaveProperty('removeBackground');
    expect(config).not.toHaveProperty('aiPreprocess');
  });

  it('does not expose remove.bg defaults in any mode', () => {
    expect(createProcessConfigForMode('pattern')).not.toHaveProperty('removeBackground');
    expect(createProcessConfigForMode('logo')).not.toHaveProperty('removeBackground');
    expect(createProcessConfigForMode('subject')).not.toHaveProperty('removeBackground');
  });
});
