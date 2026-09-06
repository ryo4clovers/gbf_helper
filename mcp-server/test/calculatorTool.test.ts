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
    const calculator = tools.tools.find((tool) => tool.name === "calculate_normal_attack_damage");
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

    const catalogResult = await client.callTool({ name: "list_calculator_weapons", arguments: {} });
    const catalogText = catalogResult.content.find((item) => item.type === "text");
    const catalogResponse = JSON.parse(catalogText?.type === "text" ? catalogText.text : "{}") as {
      weapons?: Array<{ weaponId?: string }>;
    };
    assert.equal(catalogResponse.weapons?.length, 4);
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040218900"));
    assert.ok(catalogResponse.weapons?.some((weapon) => weapon.weaponId === "1040915300"));

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
    assert.equal(summonResponse.summons?.length, 3);
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040090000"));
    assert.ok(summonResponse.summons?.some((summon) => summon.summonId === "2040094000"));
  } finally {
    await clientTransport.close();
    await serverTransport.close();
  }
});
