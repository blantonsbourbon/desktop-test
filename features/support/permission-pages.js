export const permissionPages = {
  客户资料基础设置页: {
    navigate: [
      '菜单栏.账户中心',
      '菜单栏.账户信息',
      '菜单栏.客户资料基础设置',
    ],

    adminNodeName: '客户基础资料设置',

    permissions: {
      查询: {
        actualKey: '查询按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
      修改: {
        actualKey: '修改按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
      导出: {
        actualKey: '导出按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
      免查询导出: {
        actualKey: '免查询导出按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
    },
  },

  资金账户设置页: {
    navigate: [
      '菜单栏.账户中心',
      '菜单栏.账户信息',
      '菜单栏.资金账户设置',
    ],

    adminNodeName: '资金账户设置',

    permissions: {
      查询: {
        actualKey: '查询按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
      修改: {
        actualKey: '修改按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
      删除: {
        actualKey: '删除按钮',
        checkedState: 'enabled',
        uncheckedState: 'disabledOrHidden',
      },
    },
  },
};
