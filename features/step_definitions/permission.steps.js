import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import * as req from '../../utils/ui_request.js';
import { permissionPages } from '../support/permission-pages.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const envValue = (key, fallback) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const attachJson = async (world, name, value) => {
  if (typeof world.attach !== 'function') return;

  await world.attach(
    JSON.stringify({ name, value }, null, 2),
    'application/json'
  );
};

const operatorSettingPage = '操作员设置页';
const knownOperatorRoles = [
  ...new Set(
    Object.values(permissionPages).flatMap(pageConfig =>
      Object.keys(pageConfig.expectedPermissionsByRole ?? {})
    )
  ),
];

const operatorRoleCheckboxTarget = role =>
  `${operatorSettingPage}.${role}-${role}`;

const operatorRoleInfoTarget = role => `${operatorSettingPage}.${role}`;

const pickFirstInfoRow = info => (Array.isArray(info) ? info[0] : info) ?? {};
const infoKey = item => `${item}-${item}`;

const stateTokens = value => {
  if (typeof value !== 'string') return new Set();

  return new Set(value.split(',').map(item => item.trim().toLowerCase()));
};

const toBool = value => stateTokens(value).has('checked');

const isFocused = value => stateTokens(value).has('focused');

const checkboxValue = (row, item) =>
  row[infoKey(item)] ?? row.state ?? row.State ?? row.value ?? row.Value;

const clickRoleCheckbox = async (target, value) => {
  await req.click(target);

  if (!isFocused(value)) {
    await sleep(100);
    await req.click(target);
  }
};

export const selectOnlyRole = async role => {
  const roles = [...new Set([...knownOperatorRoles, role])];

  for (const currentRole of roles) {
    const target = operatorRoleCheckboxTarget(currentRole);
    const shouldChecked = currentRole === role;
    const info = await req.getInfo(operatorRoleInfoTarget(currentRole));
    const value = checkboxValue(pickFirstInfoRow(info), currentRole);
    const actualChecked = toBool(value);

    if (actualChecked !== shouldChecked) {
      await clickRoleCheckbox(target, value);
      await sleep(200);
    }
  }
};

const assertPermissionComparison = comparison => {
  const mismatches = comparison.permissions.filter(item => !item.matched);

  assert.equal(
    mismatches.length,
    0,
    [
      '权限不一致',
      `页面: ${comparison.pageName}`,
      `角色: ${comparison.role}`,
      ...mismatches.map(
        item =>
          [
            `权限: ${item.permissionName}`,
            `期望元素: ${item.expectedExists ? '存在' : '不存在'}`,
            `实际元素: ${item.actualExists ? '存在' : '不存在'}`,
          ].join(', ')
      ),
    ].join('\n')
  );
};

const assertPermissionSummary = summary => {
  const mismatches = summary.pages.flatMap(page =>
    page.mismatches.map(item => ({ ...item, pageName: page.pageName }))
  );

  assert.equal(
    mismatches.length,
    0,
    [
      '权限不一致',
      `角色: ${summary.role}`,
      ...mismatches.map(
        item =>
          [
            `页面: ${item.pageName}`,
            `权限: ${item.permissionName}`,
            `期望元素: ${item.expectedExists ? '存在' : '不存在'}`,
            `实际元素: ${item.actualExists ? '存在' : '不存在'}`,
          ].join(', ')
      ),
    ].join('\n')
  );
};

const pagesForRole = role =>
  Object.entries(permissionPages)
    .filter(([, pageConfig]) => pageConfig.expectedPermissionsByRole?.[role])
    .map(([pageName]) => pageName);

const commonPrefixLength = (left, right) => {
  const maxLength = Math.min(left.length, right.length);
  let index = 0;

  while (index < maxLength && left[index] === right[index]) {
    index += 1;
  }

  return index;
};

const openBusinessPage = async (world, pageName) => {
  const pageConfig = permissionPages[pageName];
  assert.ok(pageConfig, `未找到页面权限配置: ${pageName}`);

  const previousNavigate = world.currentNavigatePath ?? [];
  const navigate = pageConfig.navigate;
  let startIndex = commonPrefixLength(previousNavigate, navigate);

  if (
    startIndex === navigate.length &&
    previousNavigate.length > navigate.length
  ) {
    startIndex = Math.max(navigate.length - 1, 0);
  }

  for (const target of navigate.slice(startIndex)) {
    await req.click(target);
    await sleep(300);
  }

  world.currentNavigatePath = [...navigate];
};

const comparePagePermissions = async (world, pageName, role) => {
  const pageConfig = permissionPages[pageName];
  assert.ok(pageConfig, `未找到页面权限配置: ${pageName}`);

  const expectedPermissions = pageConfig.expectedPermissionsByRole?.[role];
  assert.ok(
    expectedPermissions,
    [
      '页面权限配置中未找到角色期望权限',
      `页面: ${pageName}`,
      `角色: ${role}`,
    ].join('\n')
  );

  await attachJson(world, `expectedPermissions:${pageName}`, {
    pageName,
    role,
    permissions: expectedPermissions,
  });

  const actualPermissions = {};

  for (const [permissionName] of Object.entries(expectedPermissions)) {
    const actualExists = await req.elementExists(`${pageName}.${permissionName}`);
    actualPermissions[permissionName] = actualExists;
  }

  await attachJson(world, `actualPermissions:${pageName}`, {
    pageName,
    role,
    permissions: actualPermissions,
  });

  const permissions = Object.entries(expectedPermissions).map(
    ([permissionName, expectedExists]) => {
      const normalizedExpectedExists = expectedExists === true;
      const actualExists = actualPermissions[permissionName];

      return {
        permissionName,
        expectedExists: normalizedExpectedExists,
        actualExists,
        matched: actualExists === normalizedExpectedExists,
      };
    }
  );
  const mismatches = permissions.filter(item => !item.matched);
  const comparison = {
    pageName,
    role,
    status: mismatches.length === 0 ? 'match' : 'unmatch',
    permissions,
    mismatches,
  };

  await attachJson(world, `permissionComparison:${pageName}`, comparison);

  return comparison;
};

Given('客户端已启动', async function () {
  await req.launch();
});

Given('管理员登录客户端', async function () {
  await req.edit('客户端.用户名', envValue('ADMIN_USER', 'admin'));
  await req.edit('客户端.密码', envValue('ADMIN_PASSWORD', 'admin'));
  await req.click('客户端.登录按钮');
  await sleep(1000);
});

When('管理员选择操作员 {string} 和角色 {string}', async function (operator, role) {
  this.operator = operator;
  this.role = role;

  await req.click('菜单栏.操作员设置');
  await req.comboBoxSelect('操作员设置页.操作员代码', operator);
  await selectOnlyRole(role);
  await sleep(500);
});

When('当前账号退出客户端', async function () {
  await req.click('客户端.退出登录');
  this.currentNavigatePath = [];
  await sleep(1000);
});

When('操作员 {string} 登录客户端', async function (operator) {
  await req.edit('客户端.用户名', envValue(`${operator}_USER`, operator));
  await req.edit('客户端.密码', envValue(`${operator}_PASSWORD`, 'password'));
  await req.click('客户端.登录按钮');
  this.currentNavigatePath = [];
  await sleep(1000);
});

When('打开业务页面 {string}', async function (pageName) {
  await openBusinessPage(this, pageName);
});

Then('页面 {string} 的实际权限应与期望权限一致', async function (pageName) {
  const comparison = await comparePagePermissions(this, pageName, this.role);

  assertPermissionComparison(comparison);
});

Then('当前角色在所有配置页面的实际权限应与期望权限一致', async function () {
  const pageNames = pagesForRole(this.role);
  assert.ok(
    pageNames.length > 0,
    `未找到角色 ${this.role} 的页面权限配置`
  );

  await attachJson(this, 'plannedPages', {
    role: this.role,
    pages: pageNames,
  });

  const pages = [];

  for (const pageName of pageNames) {
    await attachJson(this, 'currentPage', {
      role: this.role,
      pageName,
    });
    await openBusinessPage(this, pageName);
    pages.push(await comparePagePermissions(this, pageName, this.role));
  }

  const summary = {
    role: this.role,
    status: pages.every(page => page.status === 'match') ? 'match' : 'unmatch',
    pages: pages.map(page => ({
      pageName: page.pageName,
      status: page.status,
      mismatches: page.mismatches,
    })),
  };

  await attachJson(this, 'permissionComparisonSummary', summary);

  assertPermissionSummary(summary);
});
