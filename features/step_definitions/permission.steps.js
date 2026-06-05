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

const findControlInfo = ({ pageName, actualInfo, actualKey }) => {
  assert.ok(
    Array.isArray(actualInfo),
    `页面 ${pageName} getInfo 需要返回 List<Dictionary>，例如 [{ name: '${actualKey}', enabled: true }]`
  );

  const actualControl = actualInfo.find(control => control?.name === actualKey);

  assert.ok(
    actualControl,
    [
      '未找到控件状态',
      `页面: ${pageName}`,
      `控件: ${actualKey}`,
      `实际返回: ${JSON.stringify(actualInfo)}`,
    ].join('\n')
  );

  return actualControl;
};

const assertControlEnabled = ({ pageName, permissionName, actualKey, actualControl, expectedEnabled }) => {
  assert.equal(
    actualControl?.enabled,
    expectedEnabled,
    [
      '权限不一致',
      `页面: ${pageName}`,
      `权限: ${permissionName}`,
      `控件: ${actualKey}`,
      `管理员配置: ${expectedEnabled ? '勾选' : '未勾选'}`,
      `期望 enabled: ${expectedEnabled}`,
      `操作员实际: ${JSON.stringify(actualControl)}`,
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
  await req.checkboxSelect(`操作员设置页.${role}`);
  await sleep(500);
});

When('管理员读取当前角色的操作权限', async function () {
  const info = await req.getInfo('操作员设置页');

  assert.ok(
    info?.operationPermissions,
    '操作员设置页 getInfo 需要返回 operationPermissions'
  );

  this.adminPermissionMatrix = info.operationPermissions;
  await attachJson(this, 'adminPermissionMatrix', this.adminPermissionMatrix);
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

Then('页面 {string} 的实际权限应与管理员配置一致', async function (pageName) {
  const pageConfig = permissionPages[pageName];
  assert.ok(pageConfig, `未找到页面权限配置: ${pageName}`);

  const expectedPermissions = this.adminPermissionMatrix?.[pageConfig.adminNodeName];
  assert.ok(
    expectedPermissions,
    `管理员权限树中未找到节点: ${pageConfig.adminNodeName}`
  );

  const actualInfo = await req.getInfo(pageName);
  await attachJson(this, 'actualPageInfo', actualInfo);

  for (const [permissionName, actualKey] of Object.entries(pageConfig.permissions)) {
    const expectedEnabled = expectedPermissions[permissionName] === true;
    const actualControl = findControlInfo({ pageName, actualInfo, actualKey });

    assertControlEnabled({
      pageName,
      permissionName,
      actualKey,
      actualControl,
      expectedEnabled,
    });
  }
});
