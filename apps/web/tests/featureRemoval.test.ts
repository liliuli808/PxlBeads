import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProcessConfigForMode, PATTERN_MODE_CONFIG } from '@pxlbeads/shared';

const root = resolve(__dirname, '..');

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('AI and cutout feature removal', () => {
  it('keeps generation defaults free of AI and cutout config', () => {
    expect(Object.values(PATTERN_MODE_CONFIG).every((config) => !('removeBackground' in config))).toBe(true);

    for (const mode of Object.keys(PATTERN_MODE_CONFIG) as Array<keyof typeof PATTERN_MODE_CONFIG>) {
      const config = createProcessConfigForMode(mode);

      expect(config).not.toHaveProperty('removeBackground');
      expect(config).not.toHaveProperty('aiPreprocess');
    }
  });

  it('removes AI routes and upload-page AI entry points', () => {
    expect(read('src/router.tsx')).not.toMatch(/AIPage|path: 'ai'|path: "ai"/);
    expect(read('src/components/upload/UploadPage.tsx')).not.toMatch(/AI|\/ai/);
  });

  it('removes segmentation and AI preprocessing from editor and worker', () => {
    expect(read('src/components/editor/EditorPage.tsx')).not.toMatch(/AIControlPanel|generateImageToImage|prepareAiImageData|aiPreprocess/);
    expect(read('src/components/editor/ControlPanel.tsx')).not.toMatch(/AI|remove\.bg|抠图|aiPreprocess/);
    expect(read('src/workers/beadWorker.ts')).not.toMatch(/segmentImage|removeBackground|AI 抠图/);
  });
});
