# Desktop Permission Test Example

这是一个脱敏后的桌面端权限自动化测试组织示例。

核心思路：

- Cucumber feature 只描述通用业务流程。
- JS 配置文件维护页面、导航路径、角色期望权限。
- 后端 Page Object 继续维护 xpath，并通过 `elementExists` 返回元素是否存在。
- 前端 step definition 调用 `click`、`edit`、`elementExists`，并完成权限断言。
- `ElementExists` 通过现有 `ResultDto<List<Dictionary<string, string>>>` 返回 `data[0].exists`，前端把 `"true"` / `"false"` 转成布尔值。

页面别名统一使用 `客户端`。

## 目录

```text
features/
  operator-role-permission.feature
  step_definitions/
    permission.steps.js
  support/
    permission-pages.js
utils/
  ui_request.js
examples/
  csharp/
    PageObjectExamples.cs
```

## 使用方式

把 `utils/ui_request.js` 替换或改造成你们现有的后端 action 调用层即可。真实项目里如果已经有 `utils/ui_request.js`，可以只迁移 `features` 和 `permission-pages.js` 的组织方式。

默认 action 服务地址为 `http://localhost:5000/actions`，可通过 `UI_ACTION_ENDPOINT` 覆盖；默认应用别名为 `客户端`，可通过 `globalThis.appName` 或 `UI_APP_NAME` 覆盖。
