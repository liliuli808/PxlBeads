import fs from 'fs';
import path from 'path';

/**
 * 读取项目 tests/.env 文件中的键值对。
 * 用于在 Playwright 测试里拿到账号密码，避免把凭据写进源码。
 */
export function loadEnv(relativePath: string): Record<string, string> {
  const filePath = path.resolve(new URL('.', import.meta.url).pathname, relativePath);
  const env: Record<string, string> = {};

  if (!fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // 去除简单的单/双引号包裹
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}
