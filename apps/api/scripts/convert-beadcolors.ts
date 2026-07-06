import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

interface ColorEntry {
  code: string;
  name: string;
  rgbHex: string;
  source: string;
}

function csvToJson(csv: string, source: string): ColorEntry[] {
  const lines = csv.trim().split('\n');
  return lines.map((line) => {
    const [code, name, r, g, b] = line.split(',');
    const rgbHex =
      '#' +
      [r, g, b]
        .map((v) => Number(v).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    return { code, name, rgbHex, source };
  });
}

async function main() {
  const brands = [
    { file: 'perler.csv', out: 'perler.json', source: 'beadcolors' },
    { file: 'hama.csv', out: 'hama.json', source: 'beadcolors' },
    { file: 'mard.csv', out: 'mard.json', source: 'beadcolors' },
  ];

  const dataDir = join(__dirname, '..', 'data');

  for (const { file, out, source } of brands) {
    const url = `https://raw.githubusercontent.com/maxcleme/beadcolors/master/raw/${file}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch ${file}: ${res.status}`);
      continue;
    }
    const csv = await res.text();
    const json = csvToJson(csv, source);
    writeFileSync(join(dataDir, out), JSON.stringify(json, null, 2) + '\n');
    console.log(`Converted ${file} -> ${out} (${json.length} colors)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
