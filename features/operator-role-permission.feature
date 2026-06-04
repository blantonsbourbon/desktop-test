Feature: 操作员角色权限一致性

  @permission @role_matrix
  Scenario Outline: 验证角色在页面上的权限表现
    Given 客户端已启动
    And 管理员登录客户端
    When 管理员选择操作员 "<operator>" 和角色 "<role>"
    And 管理员读取当前角色的操作权限
    And 当前账号退出客户端
    And 操作员 "<operator>" 登录客户端
    And 打开业务页面 "<page>"
    Then 页面 "<page>" 的实际权限应与管理员配置一致

    Examples:
      | operator | role     | page               |
      | regTest  | ASGDaily | 客户资料基础设置页 |
      | regTest  | ASGDaily | 资金账户设置页     |
      | regTest  | Trader   | 客户资料基础设置页 |
