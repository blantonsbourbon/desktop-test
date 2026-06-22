using System.Collections.Generic;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;

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
            throw new KeyNotFoundException("未找到控件 xpath 配置");
        }

        return Root != null && Root.FindFirstByXPath(xpath) != null;
    }

    protected AutomationElement FindByKey(string key)
    {
        if (!_xpaths.TryGetValue(key, out string xpath))
        {
            throw new KeyNotFoundException("未找到控件 xpath 配置");
        }

        return Root?.FindFirstByXPath(xpath);
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

public sealed class ActionDtoExample
{
    public string AppName { get; set; }
    public List<ActionItemDtoExample> Actions { get; set; } = new();
}

public sealed class ActionItemDtoExample
{
    public string Type { get; set; }
    public string Target { get; set; }
    public string Value { get; set; }
    public List<Dictionary<string, string>> Data { get; set; }
}

public sealed class ResultDtoExample<T>
{
    public int Code { get; private set; }
    public T Data { get; private set; }

    public ResultDtoExample<T> SetCode(int code)
    {
        Code = code;
        return this;
    }

    public ResultDtoExample<T> SetData(T data)
    {
        Data = data;
        return this;
    }
}

public interface IEntityExample
{
    void Launch();
    void Show();
    void Click(string target);
    void CheckBoxSelect(string target, bool selected);
    void Edit(string target, string value);
    void ComboBoxSelect(string target, int index);
    void ComboBoxEdit(string target, string value);
    void ClickData(string target, List<Dictionary<string, string>> data);
    bool CheckElementExists(string path);
    List<Dictionary<string, string>> GetInfo(string target);
}

public sealed class EntityServiceExample
{
    public IEntityExample GetEntity(string appName)
    {
        throw new System.NotImplementedException();
    }
}

public sealed class ActionControllerExample
{
    private readonly EntityServiceExample _entityService;

    public ActionControllerExample(EntityServiceExample entityService)
    {
        _entityService = entityService;
    }

    public ResultDtoExample<List<Dictionary<string, string>>> DoActions(ActionDtoExample actionDto)
    {
        IEntityExample entity = _entityService.GetEntity(actionDto.AppName);
        if (actionDto.Actions[0].Type != "Launch") entity.Show();

        List<Dictionary<string, string>> data = new();

        foreach (var action in actionDto.Actions)
        {
            if (action.Type == "Launch")
                entity.Launch();
            else if (action.Type == "Click")
                entity.Click(action.Target);
            else if (action.Type == "CheckBoxSelect")
                entity.CheckBoxSelect(action.Target, bool.Parse(action.Value));
            else if (action.Type == "Edit")
                entity.Edit(action.Target, action.Value);
            else if (action.Type == "ComboBoxSelect")
                entity.ComboBoxSelect(action.Target, int.Parse(action.Value));
            else if (action.Type == "ComboBoxEdit")
                entity.ComboBoxEdit(action.Target, action.Value);
            else if (action.Type == "ClickData")
                entity.ClickData(action.Target, action.Data);
            else if (action.Type == "ElementExists")
            {
                bool exists = entity.CheckElementExists(action.Target);

                data.Add(new Dictionary<string, string>
                {
                    ["type"] = "ElementExists",
                    ["target"] = action.Target,
                    ["exists"] = exists ? "true" : "false",
                });
            }
            else if (action.Type == "GetInfo")
                data = entity.GetInfo(action.Target);
        }

        ResultDtoExample<List<Dictionary<string, string>>> resultDto = new();
        if (data.Count > 0)
        {
            resultDto.SetData(data);
        }

        return resultDto.SetCode(200);
    }
}

public sealed class OperatorSettingPageExample : AppPage
{
    public OperatorSettingPageExample()
    {
        AddXpath("操作员代码", "/Pane/Window/Pane/ComboBox");
        AddXpath("操作权限", "/Pane/Window/Pane/Tab/TabItem[1]");
        AddXpath("RoleA-RoleA", "/Pane/Window/Pane/List/CheckBox[1]");
        AddXpath("RoleB-RoleB", "/Pane/Window/Pane/List/CheckBox[2]");
    }

    public List<Dictionary<string, string>> GetInfo(string roleName)
    {
        string target = roleName.Contains("-") ? roleName : $"{roleName}-{roleName}";
        AutomationElement item = FindByKey(target);

        if (item == null)
        {
            throw new KeyNotFoundException("未找到角色 checkbox");
        }

        ToggleState toggleState = item.Patterns.Toggle.Pattern.ToggleState.Value;

        return new List<Dictionary<string, string>>
        {
            new Dictionary<string, string>
            {
                ["type"] = "CheckBoxInfo",
                ["checked"] = toggleState == ToggleState.On ? "true" : "false",
                ["enabled"] = item.IsEnabled ? "true" : "false",
                ["toggleState"] = toggleState.ToString(),
            },
        };
    }
}

public sealed class CustomerBasicSettingPageExample : AppPage
{
    public CustomerBasicSettingPageExample()
    {
        AddXpath("查询", "//Button[@Name='查询']");
        AddXpath("修改", "//Button[@Name='修改']");
        AddXpath("导出", "//Button[@Name='导出']");
        AddXpath("免查询导出", "//Button[@Name='免查询导出']");
    }
}
