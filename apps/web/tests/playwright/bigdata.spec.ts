import { test, expect, type Page } from '@playwright/test';
import { loadEnv } from './env';

/**
 * 广昇数据中台（bigdata.coszenmost.com）全页面覆盖测试。
 *
 * 凭据读取优先级：
 * 1. tests/.env 文件（BIGDATA_USERNAME / BIGDATA_PASSWORD 或 WMS_USERNAME / WMS_PASSWORD）
 * 2. 当前进程环境变量
 *
 * 运行方式（从 apps/web 目录）：
 *   source tests/.env && npx playwright test tests/playwright/bigdata.spec.ts
 */
const env = loadEnv('../.env');
const username =
  env.BIGDATA_USERNAME || env.WMS_USERNAME || process.env.BIGDATA_USERNAME || process.env.WMS_USERNAME || '';
const password =
  env.BIGDATA_PASSWORD || env.WMS_PASSWORD || process.env.BIGDATA_PASSWORD || process.env.WMS_PASSWORD || '';

test.use({ baseURL: 'https://bigdata.coszenmost.com' });
test.setTimeout(120000);

const loginAccountInput = 'input[placeholder="账号"]';
const loginPasswordInput = 'input[placeholder="密码"]';
const loginNavigationTimeout = 25000;
const loginReadyTimeout = 30000;
const rootMenu = 'ul.el-menu-vertical-demo';

/** 侧边栏菜单导航辅助函数 */
async function clickTopLevelMenu(page: Page, label: string) {
  await page.locator('.el-menu-item.el-menu-vertical-demo-child').filter({ hasText: label }).first().click();
}

async function expandSubMenu(page: Page, label: string) {
  const title = page.locator('.el-menu-vertical-demo-child-title').filter({ hasText: label }).first();
  const submenu = page.locator('.el-sub-menu').filter({ has: title }).first();
  const isOpen = await submenu.evaluate((el) => el.classList.contains('is-open')).catch(() => false);
  if (!isOpen) {
    await title.click();
  }
}

async function clickSubMenuItem(page: Page, parent: string, child: string) {
  await page
    .locator('.el-sub-menu')
    .filter({ has: page.locator('.el-menu-vertical-demo-child-title').filter({ hasText: parent }) })
    .first()
    .locator('.el-menu-item.el-menu-vertical-demo-child')
    .filter({ hasText: child })
    .first()
    .click();
}

function expectBreadcrumb(page: Page, label: string) {
  return expect(
    page.locator('.el-breadcrumb__item, .tags-view-item, .el-page-header__content').filter({ hasText: label }).first()
  ).toBeVisible();
}

async function waitForPageSettled(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.el-loading-mask')).every((el) => {
          const style = window.getComputedStyle(el);
          return style.display === 'none' || style.visibility === 'hidden' || (el as HTMLElement).offsetParent === null;
        }),
      undefined,
      { timeout: 10000 }
    )
    .catch(() => undefined);
}

async function openLogin(page: Page): Promise<'login' | 'app'> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt === 1) {
      await page.goto('/#/login', { waitUntil: 'domcontentloaded', timeout: loginNavigationTimeout }).catch(() => undefined);
    } else {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: loginNavigationTimeout }).catch(() => undefined);
    }

    const readyState = await Promise.race([
      page.locator(loginAccountInput).waitFor({ state: 'visible', timeout: loginReadyTimeout }).then(() => 'login' as const),
      page.locator(rootMenu).first().waitFor({ state: 'visible', timeout: loginReadyTimeout }).then(() => 'app' as const),
    ]).catch(() => undefined);

    if (readyState) {
      return readyState;
    }
  }

  throw new Error('登录页或主应用菜单未在预期时间内渲染');
}

async function login(page: Page) {
  if (!username || !password) {
    throw new Error('请在 tests/.env 或环境变量中设置 BIGDATA_USERNAME / BIGDATA_PASSWORD 或 WMS_USERNAME / WMS_PASSWORD');
  }

  const state = await openLogin(page);
  await expect(page).toHaveTitle('CZM_Data_Center');

  if (state === 'login') {
    await page.locator(loginAccountInput).fill(username);
    await page.locator(loginPasswordInput).fill(password);
    await page.locator('button').filter({ hasText: '登录' }).click();
  }

  await expect(page.getByText('广昇数据中台')).toBeVisible({ timeout: 30000 });
  await expect(page.locator(rootMenu).first()).toBeVisible();
  await waitForPageSettled(page);
}

async function navigateToMenuPage(page: Page, pageInfo: (typeof ALL_PAGES)[number]) {
  if (pageInfo.topLevel) {
    await clickTopLevelMenu(page, pageInfo.path[0]);
  } else {
    await expandSubMenu(page, pageInfo.path[0]);
    await clickSubMenuItem(page, pageInfo.path[0], pageInfo.path[1]);
  }

  await page.waitForURL(pageInfo.urlGlob, { timeout: 20000 });
  await waitForPageSettled(page);
}

/**
 * 全量页面清单：每个条目表示一次左侧菜单点击后应到达的路由。
 * 通过真实浏览器探测得到，路径与 URL 一一对应。
 */
const ALL_PAGES: {
  path: string[];
  urlGlob: string;
  /** 页面面包屑/标签中应出现的文案 */
  breadcrumb?: string;
  /** 页面主体中应出现的特殊文案（当 breadcrumb 无法用时） */
  expectedText?: string;
  /** 是否为一级叶子菜单（工作台、BI驾驶舱） */
  topLevel?: boolean;
}[] = [
  { path: ['工作台'], urlGlob: '**/#/', breadcrumb: '工作台', topLevel: true },
  { path: ['BI驾驶舱'], urlGlob: '**/#/', expectedText: 'BI视图', topLevel: true },

  { path: ['销售管理', '销售订单'], urlGlob: '**/#/sales-management/sales-order', breadcrumb: '销售订单' },
  { path: ['销售管理', '售后订单'], urlGlob: '**/#/sales-management/after-sales-order', breadcrumb: '售后订单' },
  { path: ['销售管理', '用户列表'], urlGlob: '**/#/sales-management/user-report', breadcrumb: '用户列表' },

  { path: ['财务管理', '订单统计'], urlGlob: '**/#/financial/order-statistics-report', breadcrumb: '订单统计' },
  { path: ['财务管理', '财务应收款'], urlGlob: '**/#/financial/settlement-receivable', breadcrumb: '财务应收款' },
  { path: ['财务管理', '财务应付款'], urlGlob: '**/#/financial/settlement-pay', breadcrumb: '财务应付款' },
  { path: ['财务管理', '海关税金'], urlGlob: '**/#/financial/customs-tax', breadcrumb: '海关税金' },
  { path: ['财务管理', '销项税金'], urlGlob: '**/#/financial/output-vat', breadcrumb: '销项税金' },
  { path: ['财务管理', '业务收入'], urlGlob: '**/#/financial/prime-operating-revenue', breadcrumb: '业务收入' },
  { path: ['财务管理', '利润统计'], urlGlob: '**/#/financial/profit-rate', breadcrumb: '利润统计' },
  { path: ['财务管理', '佣金统计'], urlGlob: '**/#/financial/commission_statistics_management', breadcrumb: '佣金统计' },
  { path: ['财务管理', '投流统计'], urlGlob: '**/#/financial/casting-flow-management', breadcrumb: '投流统计' },

  { path: ['商品管理', '库存管理'], urlGlob: '**/#/shop/stock-management', breadcrumb: '库存管理' },
  { path: ['商品管理', '商品列表'], urlGlob: '**/#/shop/shop-management', breadcrumb: '商品列表' },

  { path: ['基础配置', '仓库管理'], urlGlob: '**/#/system/storage-management', breadcrumb: '仓库管理' },
  { path: ['基础配置', '商户管理'], urlGlob: '**/#/system/supplier-management', breadcrumb: '商户管理' },
  { path: ['基础配置', '店铺管理'], urlGlob: '**/#/system/store-management', breadcrumb: '店铺管理' },
  { path: ['基础配置', '地址管理'], urlGlob: '**/#/system/address', breadcrumb: '地址管理' },
  { path: ['基础配置', '业务收入管理'], urlGlob: '**/#/system/revenue-management', breadcrumb: '业务收入管理' },
  { path: ['基础配置', '收支项目管理'], urlGlob: '**/#/system/project-management', breadcrumb: '收支项目管理' },
  { path: ['基础配置', '投流平台管理'], urlGlob: '**/#/system/plat-management', breadcrumb: '投流平台管理' },
  { path: ['基础配置', '日志管理'], urlGlob: '**/#/system/log-management', breadcrumb: '日志管理' },

  { path: ['账户管理', '账户列表'], urlGlob: '**/#/account/account-list', breadcrumb: '账户列表' },

  { path: ['系统设置', '角色管理'], urlGlob: '**/#/permission/roles', breadcrumb: '角色管理' },
  { path: ['系统设置', '菜单管理'], urlGlob: '**/#/permission/permissions', breadcrumb: '菜单管理' },
  { path: ['系统设置', '岗位管理'], urlGlob: '**/#/permission/jobs', breadcrumb: '岗位管理' },
  { path: ['系统设置', '部门管理'], urlGlob: '**/#/permission/departments', breadcrumb: '部门管理' },

  { path: ['开发者工具', '模块管理'], urlGlob: '**/#/devlop-tools/module-management', breadcrumb: '模块管理' },
];

type MenuTreeNode = {
  text: string;
  children?: string[];
};

const EXPECTED_MENU_TREE = ALL_PAGES.reduce<MenuTreeNode[]>((tree, pageInfo) => {
  if (pageInfo.topLevel) {
    tree.push({ text: pageInfo.path[0] });
    return tree;
  }

  const parentText = pageInfo.path[0];
  const childText = pageInfo.path[1];
  let parent = tree.find((node) => node.text === parentText);
  if (!parent) {
    parent = { text: parentText, children: [] };
    tree.push(parent);
  }
  parent.children?.push(childText);
  return tree;
}, []);

async function getMenuTree(page: Page): Promise<MenuTreeNode[]> {
  return page.evaluate(() => {
    const cleanText = (value: string | null | undefined) => (value || '').trim().replace(/\s+/g, ' ');
    const root = document.querySelector('ul.el-menu-vertical-demo');

    return Array.from(root?.children || [])
      .filter((el) => el.classList.contains('el-menu-item') || el.classList.contains('el-sub-menu'))
      .map((el) => {
        if (el.classList.contains('el-sub-menu')) {
          return {
            text: cleanText(el.querySelector(':scope > .el-sub-menu__title')?.textContent),
            children: Array.from(el.querySelectorAll(':scope .el-menu-item')).map((child) =>
              cleanText(child.textContent)
            ),
          };
        }

        return { text: cleanText(el.textContent) };
      });
  });
}

/**
 * 未登录状态的登录页测试。
 */
test.describe('登录页（未登录状态）', () => {
  test('登录页应正确渲染', async ({ page }) => {
    await expect(await openLogin(page)).toBe('login');

    await expect(page).toHaveTitle('CZM_Data_Center');
    await expect(page.getByText(/Welcome.*Data Center/)).toBeVisible();
    await expect(page.getByText('数据中台系统')).toBeVisible();
    await expect(page.locator(loginAccountInput)).toBeVisible();
    await expect(page.locator(loginPasswordInput)).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '登录' })).toBeVisible();
  });

  test('登录页不应有明显控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(await openLogin(page)).toBe('login');

    const criticalErrors = errors.filter((e) => !e.includes('favicon'));
    if (criticalErrors.length > 0) {
      console.warn('控制台错误:', criticalErrors);
    }
    expect(criticalErrors).toEqual([]);
  });
});

/**
 * 已登录状态下的全页面覆盖测试。
 */
test.describe('全页面覆盖（已登录，桌面端）', () => {
  test.skip(({ isMobile }) => isMobile, '侧边栏全页面导航只在桌面端项目执行');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('左侧菜单应覆盖当前账号可见的全部页面', async ({ page }) => {
    await expect.poll(() => getMenuTree(page)).toEqual(EXPECTED_MENU_TREE);
  });

  for (const pageInfo of ALL_PAGES) {
    const label = pageInfo.path.join(' -> ');

    test(`导航到 ${label}`, async ({ page }) => {
      await navigateToMenuPage(page, pageInfo);

      // 面包屑/标签页应出现当前页面名称，或使用页面主体特殊文案
      if (pageInfo.expectedText) {
        await expect(page.getByText(pageInfo.expectedText)).toBeVisible();
      } else if (pageInfo.breadcrumb) {
        await expectBreadcrumb(page, pageInfo.breadcrumb);
      }

      // 一级菜单需额外校验当前菜单处于激活状态
      if (pageInfo.topLevel) {
        await expect(
          page.locator('.el-menu-item.is-active').filter({ hasText: pageInfo.path[0] })
        ).toBeVisible();
      }
    });
  }

  test('退出登录应返回登录页', async ({ page }) => {
    await page.locator('.header-top-avatar-wrapper').click();
    await page.getByText('退出登录').click();

    // Element Plus 确认对话框
    await page.getByRole('button', { name: '确定' }).click();

    await page.waitForURL('**/#/login', { timeout: 15000 });
    await expect(page.locator(loginAccountInput)).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '登录' })).toBeVisible();
  });
});
