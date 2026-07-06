# AI 开发指南 - 拼豆图纸生成器

## 1. 给 AI 助手 (Cursor/Copilot) 的 Prompt 指令
> 你要开发一个"图片转拼豆图纸"的 Web 应用。核心是把用户上传的图片转成低分辨率网格，每格映射到真实品牌色号，生成数豆清单。
> 
> **基本要求**：
> 1. 算法完全在前端 Web Worker 中运行。
> 2. 所有颜色匹配必须使用 CIELAB 空间的 CIEDE2000 色差公式，禁止直接使用 RGB 空间欧式距离。
> 3. 提供 3 个核心模块：`downsample(image, w, h)`、`quantizeToBrand(pixels, brand, maxColors)`、`cleanIsolatedPoints(grid)`。

## 2. 关键算法实现参考 (TypeScript)
```typescript
interface Color {
  code: string;
  rgb: [number, number, number];
  lab: [number, number, number];
}

// CIEDE2000 距离计算
function deltaE2000(color1: [number, number, number], color2: [number, number, number]): number {
  // 具体的 CIEDE2000 算法实现
  // ...
  return distance;
}
```

## 3.在每次回复末尾注明你遵守了哪条约束