import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import type { BrandColor, RGB } from '@pxlbeads/shared';
import { quantizeToBrand } from '../src/engine/quantizeToBrand';

export interface PrototypeOptions {
  input: string;
  output: string;
  size: number;
  maxColors: number;
  brand: string;
  cellSize: number;
}

interface ColorCardLike {
  brand: string;
  code: string;
  name?: string | null;
  rgbHex: string;
  labL: number;
  labA: number;
  labB: number;
}

interface GenerateResult {
  output: string;
  width: number;
  height: number;
  totalCells: number;
  actualColors: number;
  brand: string;
}

const DEFAULT_OPTIONS = {
  size: 96,
  maxColors: 32,
  brand: 'mard',
  cellSize: 12,
} satisfies Omit<PrototypeOptions, 'input' | 'output'>;

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

export function parseArgs(args: string[] = process.argv.slice(2)): PrototypeOptions {
  const options: Partial<PrototypeOptions> = { ...DEFAULT_OPTIONS };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--input':
        options.input = readValue(args, i, arg);
        i++;
        break;
      case '--output':
        options.output = readValue(args, i, arg);
        i++;
        break;
      case '--size':
        options.size = parsePositiveInteger(readValue(args, i, arg), arg);
        i++;
        break;
      case '--max-colors':
        options.maxColors = parsePositiveInteger(readValue(args, i, arg), arg);
        i++;
        break;
      case '--brand':
        options.brand = readValue(args, i, arg);
        i++;
        break;
      case '--cell-size':
        options.cellSize = parsePositiveInteger(readValue(args, i, arg), arg);
        i++;
        break;
      case '--help':
      case '-h':
        throw new Error(helpText());
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.input) {
    throw new Error('Missing required --input <path>');
  }
  if (!options.output) {
    throw new Error('Missing required --output <path>');
  }

  return options as PrototypeOptions;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid rgbHex value: ${hex}`);
  }

  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

export function selectBrandPalette(cards: ColorCardLike[], requestedBrand: string): BrandColor[] {
  if (cards.length === 0) {
    throw new Error('Color card data is empty');
  }

  const matched = cards.filter((card) => card.brand === requestedBrand);
  const selected = matched.length > 0 ? matched : cards.filter((card) => card.brand === cards[0].brand);

  return selected.map((card) => ({
    brand: card.brand,
    code: card.code,
    name: card.name ?? undefined,
    rgb: hexToRgb(card.rgbHex),
    lab: [card.labL, card.labA, card.labB],
  }));
}

async function loadColorCards(): Promise<ColorCardLike[]> {
  const file = path.resolve('public/data/color-cards.json');
  return JSON.parse(await readFile(file, 'utf8')) as ColorCardLike[];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function posterizeChannel(value: number, levels: number): number {
  const step = 255 / (levels - 1);
  return clampByte(Math.round(value / step) * step);
}

function buildLowResGrid(data: Buffer, width: number, height: number, channels: number): RGB[][] {
  const grid: RGB[][] = [];
  const posterizeLevels = 10;

  for (let y = 0; y < height; y++) {
    const row: RGB[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      row.push([
        posterizeChannel(data[idx], posterizeLevels),
        posterizeChannel(data[idx + 1], posterizeLevels),
        posterizeChannel(data[idx + 2], posterizeLevels),
      ]);
    }
    grid.push(row);
  }

  return grid;
}

function colorToHex(color: BrandColor): string {
  return `#${color.rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHex(rgb: RGB): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function adjustRgb(rgb: RGB, amount: number): RGB {
  return [
    clampByte(rgb[0] + amount),
    clampByte(rgb[1] + amount),
    clampByte(rgb[2] + amount),
  ];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function gradientId(color: BrandColor): string {
  return `bead-${color.brand}-${color.code}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function buildPatternSvg(
  grid: (BrandColor | null)[],
  width: number,
  height: number,
  cellSize: number
): string {
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;
  const paper = '#f4dfb7';
  const gridColor = '#bfa883';
  const defs = new Map<string, string>();
  const cells: string[] = [];
  const beadRadius = Math.max(1, cellSize * 0.42);
  const highlightRadius = Math.max(0.75, cellSize * 0.08);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid[y * width + x];
      if (!color) continue;

      const id = gradientId(color);
      if (!defs.has(id)) {
        defs.set(
          id,
          [
            `<radialGradient id="${id}" cx="32%" cy="28%" r="68%">`,
            `<stop offset="0%" stop-color="${rgbToHex(adjustRgb(color.rgb, 34))}"/>`,
            `<stop offset="36%" stop-color="${colorToHex(color)}"/>`,
            `<stop offset="76%" stop-color="${colorToHex(color)}"/>`,
            `<stop offset="100%" stop-color="${rgbToHex(adjustRgb(color.rgb, -36))}"/>`,
            '</radialGradient>',
          ].join('')
        );
      }

      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;
      const beadKey = escapeXml(`${color.brand}:${color.code}`);
      cells.push(
        [
          `<circle cx="${cx + cellSize * 0.035}" cy="${cy + cellSize * 0.055}" r="${beadRadius}" fill="#000000" opacity="0.14"/>`,
          `<circle data-bead="${beadKey}" cx="${cx}" cy="${cy}" r="${beadRadius}" fill="url(#${id})"/>`,
          `<circle cx="${cx - cellSize * 0.18}" cy="${cy - cellSize * 0.2}" r="${highlightRadius}" fill="#ffffff" opacity="0.32"/>`,
        ].join('')
      );
    }
  }

  const lines: string[] = [];
  for (let x = 0; x <= width; x++) {
    const px = x * cellSize + 0.5;
    lines.push(`<path d="M${px} 0V${canvasHeight}" stroke="${gridColor}" stroke-width="1" opacity="0.42"/>`);
  }
  for (let y = 0; y <= height; y++) {
    const py = y * cellSize + 0.5;
    lines.push(`<path d="M0 ${py}H${canvasWidth}" stroke="${gridColor}" stroke-width="1" opacity="0.42"/>`);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
    `<defs>${Array.from(defs.values()).join('')}</defs>`,
    `<rect width="100%" height="100%" fill="${paper}"/>`,
    '<g shape-rendering="crispEdges">',
    lines.join(''),
    '</g>',
    '<g>',
    cells.join(''),
    '</g>',
    `<desc>${escapeXml(`Generated from photo with ${width}x${height} cells`)}</desc>`,
    '</svg>',
  ].join('');
}

export async function generatePattern(options: PrototypeOptions): Promise<GenerateResult> {
  const cards = await loadColorCards();
  const palette = selectBrandPalette(cards, options.brand);

  const { data, info } = await sharp(options.input)
    .rotate()
    .resize(options.size, options.size, {
      fit: 'cover',
      position: 'center',
      kernel: sharp.kernel.lanczos3,
    })
    .modulate({ brightness: 1.08, saturation: 1.22 })
    .linear([1.06, 1.02, 0.94], [10, 6, 0])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sourceGrid = buildLowResGrid(data, info.width, info.height, info.channels);
  const { grid, stats } = quantizeToBrand(sourceGrid, palette, options.maxColors, {
    confettiMinRatio: 0.0015,
  });
  const svg = buildPatternSvg(grid, info.width, info.height, options.cellSize);

  await mkdir(path.dirname(options.output), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(options.output);

  return {
    output: options.output,
    width: info.width,
    height: info.height,
    totalCells: stats.total,
    actualColors: stats.actualColors,
    brand: palette[0]?.brand ?? options.brand,
  };
}

function helpText(): string {
  return [
    'Usage: pnpm tsx scripts/prototypePhotoToPattern.ts --input <path> --output <path> [options]',
    '',
    'Options:',
    '  --size <number>        Grid width/height, default 96',
    '  --max-colors <number>  Maximum bead colors, default 32',
    '  --brand <name>         Color card brand, default mard',
    '  --cell-size <number>   Rendered pixel size per cell, default 12',
  ].join('\n');
}

async function main(): Promise<void> {
  const result = await generatePattern(parseArgs());
  console.log(
    [
      `Wrote ${result.output}`,
      `Grid: ${result.width}x${result.height}`,
      `Brand: ${result.brand}`,
      `Cells: ${result.totalCells}`,
      `Colors: ${result.actualColors}`,
    ].join('\n')
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
