using System.Collections.Generic;
using FlaUI.Core.AutomationElements;

namespace AutomationEngine.Pages.Examples;

public abstract class AppPage
{
    private readonly Dictionary<string, string> _xpaths = new Dictionary<string, string>();
    private string _currentElement;

    protected AutomationElement Root { get; set; }

    public AppPage AddXpath(string key, string xpath)
    {
        _xpaths[key] = xpath;
        _currentElement = key;
        return this;
    }

    public AppPage AddXpath(string xpath)
    {
        _xpaths[_currentElement] = xpath;
        return this;
    }

    public bool ElementExists(string key)
    {
        if (!_xpaths.TryGetValue(key, out string xpath))
        {
            throw new KeyNotFoundException($"未找到控件 xpath 配置: {key}");
        }

        return Root != null && Root.FindFirstByXPath(xpath) != null;
    }
}

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
        AddXpath("ASGDaily-ASGDaily", "/Pane/Window/Pane/List/CheckBox[1]");
        AddXpath("Trader-Trader", "/Pane/Window/Pane/List/CheckBox[2]");
    }
}

public sealed class CustomerBasicSettingPageExample : AppPage
{
    public CustomerBasicSettingPageExample()
    {
        AddXpath("查询", "/Pane/Window/Pane/Button[1]");
        AddXpath("修改", "/Pane/Window/Pane/Button[2]");
        AddXpath("导出", "/Pane/Window/Pane/Button[3]");
        AddXpath("免查询导出", "/Pane/Window/Pane/Button[4]");
    }
}
