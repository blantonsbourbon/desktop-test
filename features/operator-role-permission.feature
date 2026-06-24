Feature: 操作员角色权限一致性

  @permission @role_matrix
  Scenario Outline: 验证角色在所有配置页面上的权限表现
    Given 客户端已启动
    And 管理员登录客户端
    When 管理员选择操作员 "<operator>" 和角色 "<role>"
    And 当前账号退出客户端
    And 操作员 "<operator>" 登录客户端
    Then 当前角色在所有配置页面的实际权限应与期望权限一致

    Examples:
      | operator | role  |
      | regTest  | RoleA |
      | regTest  | RoleB |
