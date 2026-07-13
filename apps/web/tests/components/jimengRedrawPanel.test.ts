import { describe, expect, it } from 'vitest';
import * as JimengPanel from '../../src/components/editor/JimengRedrawPanel';

interface RedrawModeForTest {
  id: string;
  label: string;
  prompt: string;
  defaultSize: string;
  recommendation: {
    patternMode: string;
    updates?: {
      width?: number;
      height?: number;
      maxColors?: number;
      mode?: string;
      dither?: boolean;
    };
  };
}

function getRedrawModes(): RedrawModeForTest[] {
  const modes = (JimengPanel as unknown as { JIMENG_REDRAW_MODES?: unknown }).JIMENG_REDRAW_MODES;
  expect(Array.isArray(modes)).toBe(true);
  return modes as RedrawModeForTest[];
}

describe('Jimeng redraw panel presets', () => {
  it('offers large, small, cartoon, and portrait redraw strategies', () => {
    const modes = getRedrawModes();

    expect(modes.map((mode) => mode.id)).toEqual(['large', 'small', 'cartoon', 'portrait']);
    expect(modes.map((mode) => mode.label)).toEqual(['大图图纸', '小图清晰', '卡通插画', '主体特写']);
    expect(modes.find((mode) => mode.id === 'large')?.recommendation.patternMode).toBe('pattern');
    expect(modes.find((mode) => mode.id === 'portrait')?.recommendation.patternMode).toBe('subject');
  });

  it('recommends a 57x57 logo-style pipeline for small clear redraws', () => {
    const smallMode = getRedrawModes().find((mode) => mode.id === 'small');

    expect(smallMode).toBeDefined();
    expect(smallMode?.prompt).toContain('57x57');
    expect(smallMode?.prompt).toContain('粗轮廓');
    expect(smallMode?.recommendation).toMatchObject({
      patternMode: 'logo',
      updates: {
        width: 57,
        height: 57,
        maxColors: 16,
        mode: 'smart',
        dither: false,
      },
    });
  });

  it('keeps the recommended flow visible to users', () => {
    const flow = (JimengPanel as unknown as { JIMENG_RECOMMENDED_FLOW?: unknown }).JIMENG_RECOMMENDED_FLOW;

    expect(flow).toEqual([
      '先用 AI 重绘整理主体和色块',
      '再生成拼豆图纸',
    ]);
  });

  it('exposes Jimeng model choices and sessionid help copy', () => {
    const modelOptions = (JimengPanel as unknown as { JIMENG_MODEL_OPTIONS?: unknown }).JIMENG_MODEL_OPTIONS;
    const helpSteps = (JimengPanel as unknown as { JIMENG_SESSION_ID_HELP_STEPS?: unknown })
      .JIMENG_SESSION_ID_HELP_STEPS;

    expect(modelOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'jimeng-image-5.0-lite' }),
        expect.objectContaining({ value: 'jimeng-image-4.7' }),
        expect.objectContaining({ value: 'jimeng-image-2.0-pro' }),
      ]),
    );
    expect(helpSteps).toEqual(
      expect.arrayContaining([
        expect.stringContaining('jimeng.jianying.com'),
        expect.stringContaining('sessionid'),
      ]),
    );
  });
});
