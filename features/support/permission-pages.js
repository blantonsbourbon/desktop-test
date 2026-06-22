export const permissionPages = {
  客户资料基础设置页: {
    navigate: [
      '菜单栏.账户中心',
      '菜单栏.账户信息',
      '菜单栏.客户资料基础设置',
    ],
    expectedPermissionsByRole: {
      RoleA: {
        查询: true,
        修改: false,
        导出: true,
        免查询导出: true,
      },
      RoleB: {
        查询: true,
        修改: false,
        导出: true,
        免查询导出: true,
      },
    },
  },

  资金账户设置页: {
    navigate: [
      '菜单栏.账户中心',
      '菜单栏.账户信息',
      '菜单栏.资金账户设置',
    ],
    expectedPermissionsByRole: {
      RoleA: {
        查询: true,
        修改: false,
        删除: false,
      },
    },
  },
};
