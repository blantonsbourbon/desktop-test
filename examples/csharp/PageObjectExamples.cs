using System.Collections.Generic;
using FlaUI.Core.AutomationElements;

namespace AutomationEngine.Pages.Examples;

public sealed class ClientPage : AppPage
{
    public ClientPage()
    {
        AddXpath("用户名", "/Pane/Window/Pane/Edit[1]");
        AddXpath("密码", "/Pane/Window/Pane/Edit[2]");
        AddXpath("登录按钮", "/Pane/Window/Pane/Button[1]");
        AddXpath("退出登录", "/Pane/Window/Pane/Button[2]");
    }
}

public sealed class PageRegistrationExample
{
    public void RegisterPages()
    {
        AddPage("客户端", new ClientPage());
        AddPage("操作员设置页", new OperatorSettingPageExample());
        AddPage("客户资料基础设置页", new CustomerBasicSettingPageExample());
    }
}

public sealed class OperatorSettingPageExample : AppPage
{
    public OperatorSettingPageExample()
    {
        AddXpath("操作员代码", "/Pane/Window/Pane/ComboBox");
        AddXpath("操作权限", "/Pane/Window/Pane/Tab/TabItem[1]");
        AddXpath("ASGDaily", "/Pane/Window/Pane/List/CheckBox[1]");
        AddXpath("Trader", "/Pane/Window/Pane/List/CheckBox[2]");
    }

    public object GetInfo()
    {
        return new
        {
            operationPermissions = new
            {
                客户基础资料设置 = new
                {
                    查询 = true,
                    修改 = false,
                    导出 = true,
                    免查询导出 = true,
                },
                资金账户设置 = new
                {
                    查询 = true,
                    修改 = false,
                    删除 = false,
                },
            },
        };
    }
}

public sealed class CustomerBasicSettingPageExample : AppPage
{
    public CustomerBasicSettingPageExample()
    {
        AddXpath("查询按钮", "/Pane/Window/Pane/Button[1]");
        AddXpath("修改按钮", "/Pane/Window/Pane/Button[2]");
        AddXpath("导出按钮", "/Pane/Window/Pane/Button[3]");
        AddXpath("免查询导出按钮", "/Pane/Window/Pane/Button[4]");
    }

    public object GetInfo()
    {
        return new List<Dictionary<string, object>>
        {
            ReadControlState("查询按钮"),
            ReadControlState("修改按钮"),
            ReadControlState("导出按钮"),
            ReadControlState("免查询导出按钮"),
        };
    }

    private Dictionary<string, object> ReadControlState(string name)
    {
        AutomationElement element = FindByName(name);

        return new Dictionary<string, object>
        {
            { "name", name },
            { "enabled", element != null && element.Properties.IsEnabled.Value },
        };
    }
}
