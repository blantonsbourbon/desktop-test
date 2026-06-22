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

const asBoolean = value => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

const pickFirstInfoRow = info => (Array.isArray(info) ? info[0] : info) ?? {};

const checkboxStateFromInfo = (info, role) => {
  const row = pickFirstInfoRow(info);
  const checked = asBoolean(
    row.checked ?? row.Checked ?? row.isChecked ?? row.IsChecked
  );
  const enabled = asBoolean(
    row.enabled ?? row.Enabled ?? row.isEnabled ?? row.IsEnabled
  );

  if (checked !== undefined) return { checked, enabled };

  const toggleState = row.toggleState ?? row.ToggleState;
  if (toggleState === 'On') return { checked: true, enabled };
  if (toggleState === 'Off') return { checked: false, enabled };

  const defaultAction =
    row.defaultAction ??
    row.DefaultAction ??
    row[role] ??
    row[`${role}-${role}`];

  if (typeof defaultAction === 'string') {
    const action = defaultAction.toLowerCase();

    if (
      action.includes('unchecked') ||
      defaultAction.includes('未检查') ||
      defaultAction.includes('未选中') ||
      defaultAction.includes('未勾选')
    ) {
      return { checked: false, enabled };
    }

    if (
      action.includes('checked') ||
      defaultAction.includes('已检查') ||
      defaultAction.includes('已选中') ||
      defaultAction.includes('已勾选')
    ) {
      return { checked: true, enabled };
    }

    if (action.includes('uncheck') || defaultAction.includes('取消')) {
      return { checked: true, enabled };
    }

    if (
      action.includes('check') ||
      defaultAction === '检查' ||
      defaultAction.includes('选中') ||
      defaultAction.includes('勾选')
    ) {
      return { checked: false, enabled };
    }
  }

  throw new Error('GetInfo 没有返回可识别的 checkbox 状态');
};

const selectOnlyOperatorRole = async role => {
  const roles = [...new Set([...knownOperatorRoles, role])];

  for (const currentRole of roles) {
    const info = await req.getInfo(operatorRoleInfoTarget(currentRole));
    const state = checkboxStateFromInfo(info, currentRole);

    if (state.enabled === false) {
      throw new Error('角色 checkbox 不可操作');
    }

    if (currentRole !== role && state.checked) {
      await req.checkboxSelect(operatorRoleCheckboxTarget(currentRole), false);
      await sleep(200);
    }
  }

  const targetInfo = await req.getInfo(operatorRoleInfoTarget(role));
  const targetState = checkboxStateFromInfo(targetInfo, role);

  if (targetState.enabled === false) {
    throw new Error('角色 checkbox 不可操作');
  }

  if (!targetState.checked) {
    await req.checkboxSelect(operatorRoleCheckboxTarget(role), true);
  }
};

const assertElementExists = ({ pageName, permissionName, actualExists, expectedExists }) => {
  assert.equal(
    actualExists,
    expectedExists,
    [
      '权限不一致',
      `页面: ${pageName}`,
      `权限: ${permissionName}`,
      `期望元素: ${expectedExists ? '存在' : '不存在'}`,
      `实际元素: ${actualExists ? '存在' : '不存在'}`,
    ].join('\n')
  );
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
  await selectOnlyOperatorRole(role);
  await sleep(500);
});

When('当前账号退出客户端', async function () {
  await req.click('客户端.退出登录');
  await sleep(1000);
});

When('操作员 {string} 登录客户端', async function (operator) {
  await req.edit('客户端.用户名', envValue(`${operator}_USER`, operator));
  await req.edit('客户端.密码', envValue(`${operator}_PASSWORD`, 'password'));
  await req.click('客户端.登录按钮');
  await sleep(1000);
});

When('打开业务页面 {string}', async function (pageName) {
  const pageConfig = permissionPages[pageName];
  assert.ok(pageConfig, `未找到页面权限配置: ${pageName}`);

  for (const target of pageConfig.navigate) {
    await req.click(target);
    await sleep(300);
  }
});

Then('页面 {string} 的实际权限应与期望权限一致', async function (pageName) {
  const pageConfig = permissionPages[pageName];
  assert.ok(pageConfig, `未找到页面权限配置: ${pageName}`);

  const expectedPermissions = pageConfig.expectedPermissionsByRole?.[this.role];
  assert.ok(
    expectedPermissions,
    [
      '页面权限配置中未找到角色期望权限',
      `页面: ${pageName}`,
      `角色: ${this.role}`,
    ].join('\n')
  );

  await attachJson(this, 'expectedPermissions', expectedPermissions);

  const actualPermissions = {};

  for (const [permissionName, expectedExists] of Object.entries(expectedPermissions)) {
    const actualExists = await req.elementExists(`${pageName}.${permissionName}`);
    actualPermissions[permissionName] = actualExists;
  }

  await attachJson(this, 'actualPermissions', actualPermissions);

  for (const [permissionName, expectedExists] of Object.entries(expectedPermissions)) {
    assertElementExists({
      pageName,
      permissionName,
      actualExists: actualPermissions[permissionName],
      expectedExists: expectedExists === true,
    });
  }
});
