import { describe, expect, it } from 'vitest';
import { buildPatternSvg, parseArgs, selectBrandPalette } from '../../scripts/prototypePhotoToPattern';

describe('prototypePhotoToPattern CLI helpers', () => {
  it('parses required input/output arguments and defaults', () => {
    const options = parseArgs([
      '--input',
      'cat.jpg',
      '--output',
      'tmp/cat-code-pattern.png',
    ]);

    expect(options).toEqual({
      input: 'cat.jpg',
      output: 'tmp/cat-code-pattern.png',
      size: 96,
      maxColors: 32,
      brand: 'mard',
      cellSize: 12,
    });
  });

  it('selects the requested brand or falls back to the first available brand', () => {
    const cards = [
      {
        brand: 'coco',
        code: 'C01',
        name: 'White',
        rgbHex: '#FFFFFF',
        labL: 100,
        labA: 0,
        labB: 0,
      },
      {
        brand: 'coco',
        code: 'C02',
        name: 'Black',
        rgbHex: '#000000',
        labL: 0,
        labA: 0,
        labB: 0,
      },
      {
        brand: 'mard',
        code: 'M01',
        name: 'Warm Brown',
        rgbHex: '#AA6633',
        labL: 52,
        labA: 24,
        labB: 39,
      },
    ];

    expect(selectBrandPalette(cards, 'mard').map((color) => color.code)).toEqual(['M01']);
    expect(selectBrandPalette(cards, 'missing').map((color) => color.code)).toEqual(['C01', 'C02']);
  });

  it('renders colored cells as round beads with highlights', () => {
    const svg = buildPatternSvg(
      [
        {
          brand: 'hama',
          code: 'H01',
          name: 'Brown',
          rgb: [170, 102, 51],
          lab: [52, 24, 39],
        },
      ],
      1,
      1,
      12
    );

    expect(svg).toContain('<radialGradient');
    expect(svg).toContain('<circle');
    expect(svg).toContain('data-bead="hama:H01"');
  });
});
