const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({}),
  additionalProperties: false,
});

const READ_ONLY_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
});

function registerTool(modelContext, definition, onRegistrationError) {
  try {
    const registration = modelContext.registerTool(definition);
    Promise.resolve(registration).catch(onRegistrationError);
  } catch (error) {
    onRegistrationError(error);
  }
}

export function registerCalculatorWebMcpTools({
  modelContext,
  getCalculatorState,
  calculateCurrentSetup,
  onRegistrationError = () => undefined,
}) {
  if (typeof modelContext?.registerTool !== "function") return false;

  registerTool(modelContext, {
    name: "get_calculator_state",
    title: "現在の計算機状態を取得",
    description: "画面で最後に正常計算された編成、敵条件、環境設定と計算結果を読み取る。画面や保存データは変更しない。",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: READ_ONLY_ANNOTATIONS,
    execute: async () => getCalculatorState(),
  }, onRegistrationError);

  registerTool(modelContext, {
    name: "calculate_current_setup",
    title: "現在の編成を再計算",
    description: "画面で最後に正常計算された条件を使い、通常攻撃ダメージを再計算して返す。画面や保存データは変更しない。",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: READ_ONLY_ANNOTATIONS,
    execute: async () => calculateCurrentSetup(),
  }, onRegistrationError);

  return true;
}
