const actionEndpoint =
  process.env.UI_ACTION_ENDPOINT ?? 'http://localhost:5000/actions';

const resolveAppName = () =>
  globalThis.appName ?? process.env.UI_APP_NAME ?? '客户端';

const resultCode = result => result?.code ?? result?.Code;
const resultData = result => result?.data ?? result?.Data;

const assertSuccess = (action, result) => {
  const code = resultCode(result);

  if (code !== undefined && Number(code) !== 200) {
    throw new Error(
      `ui_request.${action} 后端返回失败: ${JSON.stringify(result)}`
    );
  }
};

const parseElementExists = (result, target) => {
  const data = resultData(result);
  const row = Array.isArray(data)
    ? data.find(item => (item?.target ?? item?.Target) === target) ?? data[0]
    : data;
  const exists = row?.exists ?? row?.Exists;

  if (exists === true || exists === 'true') return true;
  if (exists === false || exists === 'false') return false;

  throw new Error(
    `ElementExists 没有返回 exists: ${target}; response=${JSON.stringify(result)}`
  );
};

const parseGetInfo = result => resultData(result) ?? [];

class UIRequest {
  constructor(appName = resolveAppName()) {
    this.appName = appName;
    this.actions = [];
  }

  addAction(action) {
    this.actions.push(action);
    return this;
  }

  launch() {
    return this.addAction({ type: 'Launch' });
  }

  click(target) {
    return this.addAction({ type: 'Click', target });
  }

  edit(target, value) {
    return this.addAction({ type: 'Edit', target, value });
  }

  comboBoxSelect(target, value) {
    return this.addAction({
      type: 'ComboBoxSelect',
      target,
      value: String(value),
    });
  }

  checkboxSelect(target, value = true) {
    return this.addAction({
      type: 'CheckBoxSelect',
      target,
      value: String(value),
    });
  }

  elementExists(target) {
    return this.addAction({ type: 'ElementExists', target });
  }

  getInfo(target) {
    return this.addAction({ type: 'GetInfo', target });
  }

  async request() {
    const response = await fetch(actionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: this.appName,
        actions: this.actions,
      }),
    });

    const result = await response.json();

    assertSuccess(this.actions.at(-1)?.type ?? 'request', result);
    return result;
  }
}

export const launch = async () => {
  await new UIRequest().launch().request();
};

export const click = async target => {
  await new UIRequest().click(target).request();
};

export const edit = async (target, value) => {
  await new UIRequest().edit(target, value).request();
};

export const comboBoxSelect = async (target, value) => {
  await new UIRequest().comboBoxSelect(target, value).request();
};

export const checkboxSelect = async (target, value = true) => {
  await new UIRequest().checkboxSelect(target, value).request();
};

export const elementExists = async target => {
  const result = await new UIRequest().elementExists(target).request();

  return parseElementExists(result, target);
};

export const getInfo = async target => {
  const result = await new UIRequest().getInfo(target).request();

  return parseGetInfo(result);
};
