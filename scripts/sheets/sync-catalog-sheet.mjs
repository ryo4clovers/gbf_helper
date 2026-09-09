import { createSign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildWeaponSheetValues,
  buildWeaponSkillSheetValues,
  parseJapaneseChargeAttackKnowledge,
} from "./catalog-sheet-data.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..");
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

function parseArguments(argv) {
  const options = { dryRun: false, spreadsheetId: process.env.GBF_CATALOG_SPREADSHEET_ID };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--spreadsheet-id") {
      options.spreadsheetId = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`未対応の引数です: ${argument}`);
    }
  }
  return options;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function loadServiceAccount() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    return JSON.parse(await readFile(credentialsPath, "utf8"));
  }

  return undefined;
}

async function getAccessToken() {
  if (process.env.GOOGLE_SHEETS_ACCESS_TOKEN) {
    return process.env.GOOGLE_SHEETS_ACCESS_TOKEN;
  }

  const serviceAccount = await loadServiceAccount();
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
    throw new Error(
      "GOOGLE_SHEETS_ACCESS_TOKEN、GOOGLE_SERVICE_ACCOUNT_JSON、または " +
        "GOOGLE_APPLICATION_CREDENTIALS を設定してください",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccount.token_uri || DEFAULT_TOKEN_URI;
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SHEETS_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedAssertion = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedAssertion);
  signer.end();
  const assertion = `${unsignedAssertion}.${signer.sign(serviceAccount.private_key, "base64url")}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`Google OAuth認証に失敗しました: ${JSON.stringify(payload)}`);
  }
  return payload.access_token;
}

async function requestGoogleJson(url, accessToken, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Google Sheets API ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function loadCatalog(relativePath) {
  return JSON.parse(await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
}

async function loadJapaneseChargeAttacks() {
  const directory = path.join(REPOSITORY_ROOT, "knowledge", "weapons");
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith(".md") && !filename.startsWith("_") && filename !== "README.md")
    .sort();
  const entries = await Promise.all(
    filenames.map(async (filename) => parseJapaneseChargeAttackKnowledge(
      await readFile(path.join(directory, filename), "utf8"),
    )),
  );
  return entries.filter(Boolean);
}

function findSheetProperties(metadata, title) {
  const properties = metadata.sheets?.find((sheet) => sheet.properties?.title === title)?.properties;
  if (!properties) {
    throw new Error(`同期先に必要なタブがありません: ${title}`);
  }
  return properties;
}

export async function buildSyncPayload() {
  const [weaponCatalog, skillCatalog, wikiCatalog, japaneseChargeAttacks] = await Promise.all([
    loadCatalog("mcp-server/catalog/weapons.v1.json"),
    loadCatalog("mcp-server/catalog/weapon-skills.v1.json"),
    loadCatalog("knowledge/weapons/wiki-catalog.v1.json"),
    loadJapaneseChargeAttacks(),
  ]);
  return {
    weaponValues: buildWeaponSheetValues(weaponCatalog, {
      wikiCatalog,
      skillCatalog,
      japaneseChargeAttacks,
    }),
    skillValues: buildWeaponSkillSheetValues(skillCatalog),
  };
}

function columnLabel(columnCount) {
  let value = columnCount;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

export async function syncCatalogSheet(spreadsheetId, accessToken, payload) {
  const encodedId = encodeURIComponent(spreadsheetId);
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodedId}`;
  const metadata = await requestGoogleJson(
    `${baseUrl}?fields=sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))`,
    accessToken,
  );
  const weaponSheet = findSheetProperties(metadata, "武器カタログ");
  const skillSheet = findSheetProperties(metadata, "スキル・効果");
  const weaponColumns = payload.weaponValues[0].length;
  const skillColumns = payload.skillValues[0].length;
  const weaponLastColumn = columnLabel(weaponColumns);
  const skillLastColumn = columnLabel(skillColumns);

  const expansionRequests = [];
  for (const [sheet, requiredRows, requiredColumns] of [
    [weaponSheet, payload.weaponValues.length, weaponColumns],
    [skillSheet, payload.skillValues.length, skillColumns],
  ]) {
    if (sheet.gridProperties.rowCount < requiredRows) {
      expansionRequests.push({
        appendDimension: {
          sheetId: sheet.sheetId,
          dimension: "ROWS",
          length: requiredRows - sheet.gridProperties.rowCount,
        },
      });
    }
    if (sheet.gridProperties.columnCount < requiredColumns) {
      expansionRequests.push({
        appendDimension: {
          sheetId: sheet.sheetId,
          dimension: "COLUMNS",
          length: requiredColumns - sheet.gridProperties.columnCount,
        },
      });
    }
  }
  if (expansionRequests.length > 0) {
    await requestGoogleJson(`${baseUrl}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: expansionRequests }),
    });
  }

  await requestGoogleJson(`${baseUrl}/values:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: [
        {
          range: `'武器カタログ'!A1:${weaponLastColumn}${payload.weaponValues.length}`,
          majorDimension: "ROWS",
          values: payload.weaponValues,
        },
        {
          range: `'スキル・効果'!A1:${skillLastColumn}${payload.skillValues.length}`,
          majorDimension: "ROWS",
          values: payload.skillValues,
        },
      ],
    }),
  });

  const staleRanges = [];
  if (weaponSheet.gridProperties.rowCount > payload.weaponValues.length) {
    staleRanges.push(`'武器カタログ'!A${payload.weaponValues.length + 1}:${weaponLastColumn}`);
  }
  if (skillSheet.gridProperties.rowCount > payload.skillValues.length) {
    staleRanges.push(`'スキル・効果'!A${payload.skillValues.length + 1}:${skillLastColumn}`);
  }
  if (staleRanges.length > 0) {
    await requestGoogleJson(`${baseUrl}/values:batchClear`, accessToken, {
      method: "POST",
      body: JSON.stringify({ ranges: staleRanges }),
    });
  }

  return {
    weaponRows: payload.weaponValues.length - 1,
    skillRows: payload.skillValues.length - 1,
    clearedRanges: staleRanges,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const payload = await buildSyncPayload();
  const summary = {
    weaponRows: payload.weaponValues.length - 1,
    skillRows: payload.skillValues.length - 1,
    sample: {
      weapon: payload.weaponValues[1],
      skill: payload.skillValues.find((row, index) => index > 0 && row[4]),
    },
  };

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
    return;
  }
  if (!options.spreadsheetId) {
    throw new Error("--spreadsheet-id または GBF_CATALOG_SPREADSHEET_ID が必要です");
  }

  const accessToken = await getAccessToken();
  const result = await syncCatalogSheet(options.spreadsheetId, accessToken, payload);
  console.log(JSON.stringify({ mode: "sync", spreadsheetId: options.spreadsheetId, ...result }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
