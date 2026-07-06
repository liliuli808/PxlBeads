import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, parse } from 'path';
import { fileURLToPath } from 'url';
import { rgbToLab } from '../src/engine/colorSpace';
import { ColorCardRecord } from '@pxlbeads/shared';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dataDir = join(__dirname, '..', '..', 'api', 'data');
const outputDir = join(__dirname, '..', 'public', 'data');
const outputFile = join(outputDir, 'color-cards.json');

interface RawColorCard {
  code: string;
  name?: string;
  rgbHex: string;
  source?: string;
  isApproximate?: boolean;
}

function main() {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  const allCards: ColorCardRecord[] = [];
  let id = 1;

  for (const file of files) {
    const brand = parse(file).name;
    const raw: RawColorCard[] = JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));

    for (const card of raw) {
      const lab = rgbToLab([
        parseInt(card.rgbHex.slice(1, 3), 16),
        parseInt(card.rgbHex.slice(3, 5), 16),
        parseInt(card.rgbHex.slice(5, 7), 16),
      ]);

      allCards.push({
        id: id++,
        brand,
        code: card.code,
        name: card.name ?? null,
        rgbHex: card.rgbHex,
        labL: lab[0],
        labA: lab[1],
        labB: lab[2],
        source: card.source ?? null,
        isApproximate: card.isApproximate ?? false,
      });
    }
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputFile, JSON.stringify(allCards, null, 2));
  console.log(`Exported ${allCards.length} color cards to ${outputFile}`);
}

main();
