const notConnected = action => {
  throw new Error(
    `ui_request.${action} 需要接入你们现有的后端 action 服务`
  );
};

export const launch = async () => notConnected('launch');

export const click = async target => {
  void target;
  return notConnected('click');
};

export const edit = async (target, value) => {
  void target;
  void value;
  return notConnected('edit');
};

export const comboBoxSelect = async (target, value) => {
  void target;
  void value;
  return notConnected('comboBoxSelect');
};

export const checkboxSelect = async target => {
  void target;
  return notConnected('checkboxSelect');
};

export const elementExists = async target => {
  void target;
  return notConnected('elementExists');
};
