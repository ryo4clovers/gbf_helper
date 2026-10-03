import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGbfMcpServer } from "../src/server.ts";

test("lists and calls the normal attack calculator as a read-only MCP tool", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createGbfMcpServer();
  const client = new Client({ name: "calculator-test", version: "1.0.0" });

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const tools = await client.listTools();
    const automatic = tools.tools.find((tool) => tool.name === "calculate_automatic_ability_damage");
    assert.equal(automatic?.annotations?.readOnlyHint, true);
    assert.equal(automatic?.annotations?.destructiveHint, false);
    const automaticDeck = JSON.parse(readFileSync(new URL("../examples/battle-actions-request.v1.json", import.meta.url), "utf8")).deckConfig;
    const automaticResult = await client.callTool({ name: "calculate_automatic_ability_damage", arguments: {
      abilityId: "mythical-arms", calculation: { schemaVersion: 1, deckConfig: automaticDeck,
        enemy: { elementCode: "6", defense: 10 } },
    } });
    assert.notEqual(automaticResult.isError, true);
    assert.equal((automaticResult.structuredContent as { verificationStatus: string }).verificationStatus, "下書き");
    const calculator = tools.tools.find((tool) => tool.name === "calculate_normal_attack_damage");
    const generator = tools.tools.find((tool) => tool.name === "generate_battle_actions");
    assert.ok(generator);
    assert.equal(generator.annotations?.readOnlyHint, true);
    assert.equal(generator.annotations?.destructiveHint, false);
    assert.equal(generator.annotations?.openWorldHint, false);
    assert.equal(generator.annotations?.idempotentHint, true);
    const generatorInput = JSON.parse(readFileSync(new URL("../examples/battle-actions-request.v1.json", import.meta.url), "utf8"));
    const generated = await client.callTool({ name: "generate_battle_actions", arguments: generatorInput });
    assert.notEqual(generated.isError, true);
    assert.equal((generated.structuredContent as { verificationStatus: string }).verificationStatus, "下書き");
    assert.equal((generated.structuredContent as { turns: unknown[] }).turns.length, 6);
    const missingRates = await client.callTool({ name: "generate_battle_actions", arguments: {
      ...generatorInput, multiattack: { mode: "sample" },
    } });
    assert.equal(missingRates.isError, true);
    const jobCatalog = tools.tools.find((tool) => tool.name === "list_calculator_jobs");
    const fallbackWeaponCatalog = tools.tools.find(
      (tool) => tool.name === "list_job_fallback_weapons",
    );
    const weaponCatalog = tools.tools.find((tool) => tool.name === "list_calculator_weapons");
    const summonCatalog = tools.tools.find((tool) => tool.name === "list_calculator_summons");

    assert.ok(calculator !== undefined);
    assert.ok(jobCatalog !== undefined);
    assert.ok(fallbackWeaponCatalog !== undefined);
    assert.ok(weaponCatalog !== undefined);
    assert.ok(summonCatalog !== undefined);
    assert.equal(weaponCatalog.annotations?.readOnlyHint, true);
    assert.equal(jobCatalog.annotations?.readOnlyHint, true);
    assert.equal(fallbackWeaponCatalog.annotations?.readOnlyHint, true);
    assert.equal(calculator.annotations?.readOnlyHint, true);
    assert.equal(calculator.annotations?.destructiveHint, false);
    assert.equal(calculator.annotations?.openWorldHint, false);
    assert.deepEqual(calculator.inputSchema.required, [
      "schemaVersion",
      "deckConfig",
      "enemy",
    ]);
    assert.ok(calculator.inputSchema.properties?.battleEffects);
    assert.ok(calculator.inputSchema.properties?.mythicalLancerLevel);
    assert.ok(calculator.inputSchema.properties?.supportSummon);

    const request = JSON.parse(
      readFileSync(new URL("../examples/normal-attack-request.v1.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
    const callResult = await client.callTool({
      name: "calculate_normal_attack_damage",
      arguments: request,
    });
    const text = callResult.content.find((item) => item.type === "text");
    assert.equal(text?.type, "text");
    const response = JSON.parse(text?.type === "text" ? text.text : "{}") as {
      result?: { totalDamageDistribution?: { minimumDamage?: number; maximumDamage?: number } };
    };
    assert.equal(response.result?.totalDamageDistribution?.minimumDamage, 3972);
    assert.equal(response.result?.totalDamageDistribution?.maximumDamage, 4390);

    // MCP and HTTP use the same schema; newly added attack-state fields must survive validation.
    const withState = await client.callTool({ name: "calculate_normal_attack_damage", arguments: {
      ...request, mythicalLancerLevel: 3, battleEffects: { enemyDefenseDownPercent: 40, enemySupplementalDamage: 18_000 },
    } });
    assert.notEqual(withState.isError, true);
    const stateText = withState.content.find(item => item.type === "text");
    const stateResponse = JSON.parse(stateText?.type === "text" ? stateText.text : "{}");
    assert.equal(stateResponse.result.battleDamageEffects.totalDefenseDownPercent, 40);
    assert.equal(stateResponse.result.battleDamageEffects.enemySupplementalDamage, 18_000);
    const invalidState = await client.callTool({ name: "calculate_normal_attack_damage", arguments: {
      ...request, battleEffects: { enemySupplementalDamage: -1 },
    } });
    assert.equal(invalidState.isError, true);

    const catalogResult = await client.callTool({ name: "list_calculator_weapons", arguments: {} });
    const catalogText = catalogResult.content.find((item) => item.type === "text");
    const catalogResponse = JSON.parse(catalogText?.type === "text" ? catalogText.text : "{}") as {
      weapons?: Array<{ weaponId?: string }>;
    };
    assert.equal(catalogResponse.weapons?.length, 2971);
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040218900"));
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040915300"));
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040220800"));
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040401500"));
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040101500"));
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040808200"));

    const jobResult = await client.callTool({ name: "list_calculator_jobs", arguments: {} });
    const jobText = jobResult.content.find((item) => item.type === "text");
    const jobResponse = JSON.parse(jobText?.type === "text" ? jobText.text : "{}") as {
      jobs?: Array<{ jobId?: string }>;
    };
    assert.equal(jobResponse.jobs?.length, 80);
    assert.ok(jobResponse.jobs?.some((job) => job.jobId === "100501"));

    const fallbackResult = await client.callTool({
      name: "list_job_fallback_weapons",
      arguments: {},
    });
    const fallbackText = fallbackResult.content.find((item) => item.type === "text");
    const fallbackResponse = JSON.parse(
      fallbackText?.type === "text" ? fallbackText.text : "{}",
    ) as {
      weapons?: Array<{ weaponId?: string; weaponKindCode?: string }>;
    };
    assert.equal(fallbackResponse.weapons?.length, 10);
    assert.ok(
      fallbackResponse.weapons?.some(
        (weapon) => weapon.weaponId === "1010500000" && weapon.weaponKindCode === "6",
      ),
    );

    const summonResult = await client.callTool({ name: "list_calculator_summons", arguments: {} });
    const summonText = summonResult.content.find((item) => item.type === "text");
    const summonResponse = JSON.parse(summonText?.type === "text" ? summonText.text : "{}") as {
      summons?: Array<{ summonId?: string }>;
    };
    assert.equal(summonResponse.summons?.length, 124);
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040090000"));
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040094000"));
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040398000"));
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040418000"));
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040430000"));
  } finally {
    await clientTransport.close();
    await serverTransport.close();
  }
});
