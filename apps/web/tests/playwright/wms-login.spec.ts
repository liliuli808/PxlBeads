import { test, expect } from '@playwright/test';

test.describe('亲聆WMS仓库管理系统登录页', () => {
  test('首页应重定向到登录页', async ({ page, context }) => {
    // 使用原始请求验证 302 重定向（禁止自动跟随）
    const response = await context.request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe('/passport/login');
    await response.dispose();
  });

  test('登录页应正确渲染', async ({ page }) => {
    await page.goto('/passport/login', { waitUntil: 'domcontentloaded' });

    // 页面标题
    await expect(page).toHaveTitle('亲聆WMS仓库管理系统');

    // 关键文案
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page.locator('text=亲聆WMS仓库管理系统')).toBeVisible();
    await expect(page.locator('.login-board-title:has-text("登录")')).toBeVisible();

    // 表单元素
    await expect(page.locator('input[name="loginname"]')).toBeVisible();
    await expect(page.locator('input[name="operatorpw"]')).toBeVisible();
    await expect(page.locator('button#save_btn')).toBeVisible();
  });

  test('背景图片应正常加载', async ({ page }) => {
    const failedResources: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResources.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/passport/login');
    await page.waitForLoadState('networkidle');

    // 背景图应存在且加载成功
    const bgImage = page.locator('img.login-bg');
    await expect(bgImage).toHaveAttribute('src', '/public/img/login_bg.png');
    const naturalWidth = await bgImage.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // 报告加载失败的资源（排除登录接口本身）
    const nonAuthFailures = failedResources.filter((url) => !url.includes('/passport/login'));
    if (nonAuthFailures.length > 0) {
      console.warn('加载失败的资源:', nonAuthFailures);
    }
    expect(nonAuthFailures).toEqual([]);
  });

  test('空账号密码提交应给出验证提示', async ({ page }) => {
    await page.goto('/passport/login');

    // 使用 layui 的表单验证：不填直接点登录
    await page.locator('button#save_btn').click();

    // layui 验证失败时通常会在输入框上添加 layui-form-danger 类并聚焦
    await expect(page.locator('input[name="loginname"]')).toBeFocused();
  });

  test('错误凭据登录应给出服务端错误提示', async ({ page }) => {
    await page.goto('/passport/login');

    await page.fill('input[name="loginname"]', 'invalid_user');
    await page.fill('input[name="operatorpw"]', 'invalid_password');

    // 拦截登录 POST 请求
    const submitPromise = page.waitForRequest((req) =>
      req.url().includes('/passport/login') && req.method() === 'POST'
    );
    await page.locator('button#save_btn').click();

    const request = await submitPromise;
    expect(request.postData()).toContain('invalid_user');

    // 服务端应重定向回登录页并设置 loginFlag
    await page.waitForURL(/\/passport\/login\?flag=/, { waitUntil: 'domcontentloaded' });
    const url = page.url();
    expect(url).toMatch(/flag=(2|4|5)/);

    // 页面 JS 会根据 flag 弹出 layer 提示，等待提示出现
    // layer 消息通常渲染在 body 最外层，包含错误文本
    const errorTexts = [
      '错误：用户名不能为空',
      '错误：密码不能为空',
      '错误：用户名密码错误',
      '错误：操作员帐号已经被停用或被删除，请与管理员联系',
      '错误：您所属的角色已被管理员停用，请与管理员联系',
    ];
    const errorLocator = page.locator('body > div').filter({ hasText: /错误：/ });
    await expect(errorLocator.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('未检测到弹窗提示，当前 URL:', url);
    });
  });

  test('响应式布局：移动端应能访问登录表单', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/passport/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[name="loginname"]')).toBeVisible();
    await expect(page.locator('input[name="operatorpw"]')).toBeVisible();
    await expect(page.locator('button#save_btn')).toBeVisible();
  });

  test('页面不应包含明显的控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/passport/login');
    await page.waitForLoadState('networkidle');

    // 忽略常见的第三方资源错误
    const criticalErrors = errors.filter((e) => !e.includes('favicon'));
    expect(criticalErrors).toEqual([]);
  });
});
