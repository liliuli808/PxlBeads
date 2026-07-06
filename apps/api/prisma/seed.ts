import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join, parse } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const prisma = new PrismaClient();

interface RawColorCard {
  code: string;
  name?: string;
  rgbHex: string;
  source?: string;
  isApproximate?: boolean;
}

function rgbToLab(rgbHex: string): { l: number; a: number; b: number } {
  const hex = rgbHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  const xRef = 0.95047;
  const yRef = 1.0;
  const zRef = 1.08883;

  const epsilon = 0.008856;
  const kappa = 903.3;

  const fx = x / xRef > epsilon ? Math.pow(x / xRef, 1 / 3) : (kappa * x / xRef + 16) / 116;
  const fy = y / yRef > epsilon ? Math.pow(y / yRef, 1 / 3) : (kappa * y / yRef + 16) / 116;
  const fz = z / zRef > epsilon ? Math.pow(z / zRef, 1 / 3) : (kappa * z / zRef + 16) / 116;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { l, a, bVal };
}

async function main() {
  const dataDir = join(__dirname, '..', 'data');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const brand = parse(file).name;
    const raw: RawColorCard[] = JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));

    for (const card of raw) {
      const lab = rgbToLab(card.rgbHex);
      await prisma.colorCard.upsert({
        where: {
          brand_code: {
            brand,
            code: card.code,
          },
        },
        update: {
          name: card.name ?? null,
          rgbHex: card.rgbHex,
          labL: lab.l,
          labA: lab.a,
          labB: lab.bVal,
          source: card.source ?? null,
          isApproximate: card.isApproximate ?? false,
        },
        create: {
          brand,
          code: card.code,
          name: card.name ?? null,
          rgbHex: card.rgbHex,
          labL: lab.l,
          labA: lab.a,
          labB: lab.bVal,
          source: card.source ?? null,
          isApproximate: card.isApproximate ?? false,
        },
      });
    }

    console.log(`Seeded ${raw.length} colors for brand: ${brand}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
