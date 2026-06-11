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
  permission-baseline.sample.json
ansible.cfg
ansible/
  inventory/
    local.ini
  playbooks/
    run-permission-tests.yml
```

## 使用方式

把 `utils/ui_request.js` 替换或改造成你们现有的后端 action 调用层即可。真实项目里如果已经有 `utils/ui_request.js`，可以只迁移 `features` 和 `permission-pages.js` 的组织方式。

默认 action 服务地址为 `http://localhost:5000/actions`，可通过 `UI_ACTION_ENDPOINT` 覆盖；默认应用别名为 `客户端`，可通过 `globalThis.appName` 或 `UI_APP_NAME` 覆盖。

数据库抽取结果建议先落成 JSON 中间格式，再生成 `features/support/permission-pages.js`。样例见 `examples/permission-baseline.sample.json`，核心字段是 `role`、`page`、`permission`、`expectedExists`，页面导航路径放在 `navigationByPage`。

也可以通过 Ansible 执行权限测试：

```bash
ansible-playbook ansible/playbooks/run-permission-tests.yml
```

默认 inventory 是 `ansible/inventory/local.ini`，用于在当前 WSL/Linux runner 中执行 `npm run test:permission`。真实环境里可以覆盖 `permission_test_workspace`、`ui_action_endpoint`、管理员账号和 `operator_credentials_environment`。

## 后续计划

面对大量桌面端页面时，测试扩展的主线分成两条数据流：一条从数据库抽取角色权限并生成 JSON 中间格式，再转换成 JS 测试配置；另一条从现有页面对象归纳 xpath pattern 并辅助生成 C# Page Object。两条流最终都汇入 Ansible 驱动的 Cucumber 权限场景。

```mermaid
flowchart TD
    A["数据库: role / permission / page / control"] --> B["抽取权限基线"]
    B --> C["清洗和标准化为 JSON"]
    C --> C1["角色名归一"]
    C --> C2["页面别名归一"]
    C --> C3["权限名归一"]
    C --> D["生成 permission-pages.js"]

    E["现有 C# Page Object"] --> F["扫描按钮 xpath"]
    F --> G{"xpath pattern 是否稳定"}
    G -->|稳定| H["AI 生成 C# 页面对象草稿"]
    G -->|不稳定| I["人工补充页面级定位规则"]
    I --> H
    H --> J["人工 review 和编译校验"]

    D --> K["Cucumber Examples / 测试矩阵"]
    J --> L["FlaUI ElementExists"]
    K --> M["统一权限验证场景"]
    L --> M

    M --> N["Ansible playbook"]
    N --> N1["安装 Node 依赖"]
    N --> N2["注入 UI_ACTION_ENDPOINT 等环境变量"]
    N --> N3["执行 npm run test:permission"]
    N3 --> O["Cucumber JSON 报告"]
    O --> P["失败归因"]
    P --> P1["数据库权限基线错误"]
    P --> P2["JS 测试配置转换错误"]
    P --> P3["C# xpath 缺失或漂移"]
    P --> P4["Ansible runner / 环境配置错误"]
    P --> P5["真实产品权限回归"]
```

建议实施顺序：

1. 先定义数据库抽取结果的 JSON 中间格式，字段至少包含 `role`、`page`、`permission`、`expectedExists`。
2. 再写转换脚本，把中间格式生成 `features/support/permission-pages.js`，避免手工维护大量页面矩阵。
3. 同步扫描现有 C# Page Object 的按钮 xpath，判断常见按钮是否能用 `//Button[@Name='查询']` 这类稳定 pattern。
4. pattern 稳定后，用 AI 生成 C# 页面对象草稿，但仍以人工 review、编译和少量冒烟运行为准入门槛。
5. 把测试执行步骤放进 Ansible playbook，通过 inventory 管理 runner 路径、action service 地址和账号环境变量。
6. 最后把生成的 JS 配置和 C# Page Object 接入现有 Cucumber 场景，用报告区分权限数据问题、转换问题、xpath 问题、runner 配置问题和真实回归。
