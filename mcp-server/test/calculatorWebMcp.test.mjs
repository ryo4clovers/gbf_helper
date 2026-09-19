import assert from "node:assert/strict";
import test from "node:test";
import { registerCalculatorWebMcpTools } from "../web/calculator-webmcp.js";

test("registers two read-only calculator site tools without inputs", async () => {
  const tools = [];
  const state = { status: "ready", request: { schemaVersion: 1 } };
  const calculation = { status: "calculated", calculation: { status: "partial" } };

  const registered = registerCalculatorWebMcpTools({
    modelContext: { registerTool: (tool) => tools.push(tool) },
    getCalculatorState: () => state,
    calculateCurrentSetup: () => calculation,
  });

  assert.equal(registered, true);
  assert.deepEqual(tools.map((tool) => tool.name), ["get_calculator_state", "calculate_current_setup"]);
  for (const tool of tools) {
    assert.deepEqual(tool.inputSchema, {
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    });
  }
  assert.equal(await tools[0].execute({}), state);
  assert.equal(await tools[1].execute({}), calculation);
});

test("does not register tools when the browser has no WebMCP implementation", () => {
  assert.equal(registerCalculatorWebMcpTools({
    modelContext: undefined,
    getCalculatorState: () => undefined,
    calculateCurrentSetup: () => undefined,
  }), false);
});

test("calculator app exposes only the current-state WebMCP adapter", async () => {
  const app = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../web/app.js", import.meta.url), "utf8"));

  assert.match(app, /registerCalculatorWebMcpTools/u);
  assert.match(app, /rememberSuccessfulCalculation\(request, response, predictions\)/u);
  assert.doesNotMatch(app, /name:\s*["']calculate_normal_attack_damage["']/u);
  assert.doesNotMatch(app, /applyRequestToForm\(input\)/u);
  assert.doesNotMatch(app, /persistRequest\(input\)/u);
});
