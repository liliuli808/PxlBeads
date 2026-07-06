# PxlBeads 拼豆图纸智能生成平台

根据 `/home/jichi/PxlBeads` 下的三份规格文档与 AI 开发指南实现的 MVP。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + TanStack Query
- **算法引擎**：前端 Web Worker（CIELAB + CIEDE2000、K-means、双边滤波、下采样、孤点清理）
- **后端**：Fastify 4 + Prisma + SQLite
- **测试**：Vitest

## 快速开始

```bash
# 安装依赖
pnpm install

# 生成 Prisma 客户端并初始化数据库
pnpm --filter @pxlbeads/api exec prisma migrate dev
pnpm --filter @pxlbeads/api exec prisma db seed

# 启动开发服务器（需要两个终端）
pnpm --filter @pxlbeads/api dev      # API: http://localhost:3000
pnpm --filter @pxlbeads/web dev      # Web: http://localhost:5173
```

## 功能

- 上传图片（JPEG/PNG/WebP）
- 选择珠盘尺寸（29×29、57×57 或自定义）
- 多品牌色卡切换（Perler、Hama、MARD、COCO、漫漫）
- 最大色数控制与快速/智能模式
- 数豆清单
- 导出 PNG/PDF 打印图纸
- 逐行拼装辅助页（手机端）

## 测试

```bash
pnpm run test
```

## 项目结构

```
.
├── apps/
│   ├── web/          # React 前端
│   └── api/          # Fastify + SQLite 后端
├── packages/shared/  # 共享类型与协议
└── turbo.json
```

## 说明

- 核心颜色匹配完全在前端 Web Worker 中运行，使用 CIELAB 空间与 CIEDE2000 色差公式，禁用 RGB 欧氏距离。
- **Perler / Hama / MARD**：色卡数据来自开源项目 [maxcleme/beadcolors](https://github.com/maxcleme/beadcolors)（通过 GitHub API 抓取并转换）。
- **COCO / 漫漫**：当前网络环境下未能找到公开完整数据源，仍使用社区近似值，已标记 `isApproximate: true`，后续可替换为官方精确数据。
# PxlBeads
