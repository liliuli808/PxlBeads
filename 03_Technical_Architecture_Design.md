# 拼豆图纸平台 - 技术方案设计

## 1. 架构设计
系统采用"**前端重、后端轻**"的架构。核心算法（快速/智能模式）完全在浏览器端（前端 Web Worker / WebAssembly）运行，保障极佳的用户隐私和极低的服务端算力成本。

```
[浏览器前端 UI] <---> [配色引擎 Worker / WASM]
     |
     +---> [后端 API] <---> [色卡数据库 / 用户图纸 DB]
```

## 2. 技术选型
- **前端框架**：React / Vue 3 + TypeScript
- **图形处理**：Canvas 2D API 负责网格渲染，Web Worker 跑计算密集型色彩算法
- **色彩库**：CIEDE2000 色差算法实现
- **后端服务**：Node.js (NestJS) 或 Go + PostgreSQL (色卡与用户数据存储)
- **AI 绘图接口**：接入 Stable Diffusion 或 Midjourney 像素画 Lora API 做"AI 艺术模式"

## 3. 数据库设计 (色卡表)
```sql
CREATE TABLE color_cards (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(50) NOT NULL, -- 如 MARD, Hama
    code VARCHAR(50) NOT NULL,  -- 官方色号如 R05
    name VARCHAR(100),          -- 颜色名称
    rgb_hex VARCHAR(7) NOT NULL,-- 16进制颜色
    lab_l FLOAT,                -- Lab L值
    lab_a FLOAT,                -- Lab a值
    lab_b FLOAT                 -- Lab b值
);
```
