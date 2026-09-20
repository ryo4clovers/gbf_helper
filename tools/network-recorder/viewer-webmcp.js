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

const MAX_SEARCH_RESULTS = 50;
const DEFAULT_SEARCH_RESULTS = 20;
export const MAX_WEBMCP_BODY_CHARS = 200_000;

function registerTool(modelContext, definition, onRegistrationError) {
  try {
    const registration = modelContext.registerTool(definition);
    Promise.resolve(registration).catch(onRegistrationError);
  } catch (error) {
    onRegistrationError(error);
  }
}

function sanitizedUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return String(url ?? "").split(/[?#]/u, 1)[0];
  }
}

function bodyLength(record) {
  if (typeof record.body !== "string") return 0;
  if (record.bodyEncoding === "base64") return Math.floor((record.body.length * 3) / 4);
  return new TextEncoder().encode(record.body).length;
}

function jsonTopLevelKeys(record) {
  if (record.bodyEncoding !== "text" || !record.mimeType?.includes("json")) return [];
  try {
    const parsed = JSON.parse(record.body);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return [];
    return Object.keys(parsed).sort();
  } catch {
    return [];
  }
}

function metadataFor(record) {
  return {
    recordId: record.id,
    timestamp: Number.isFinite(record.timestamp) ? new Date(record.timestamp).toISOString() : null,
    status: record.status,
    resourceType: record.resourceType,
    mimeType: record.mimeType || "",
    url: sanitizedUrl(record.url),
    bodyEncoding: record.bodyEncoding,
    bodyBytes: bodyLength(record),
    jsonTopLevelKeys: jsonTopLevelKeys(record),
  };
}

function normalizedLimit(limit) {
  if (limit === undefined) return DEFAULT_SEARCH_RESULTS;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_RESULTS) {
    throw new Error(`limitは1から${MAX_SEARCH_RESULTS}の整数で指定してください`);
  }
  return limit;
}

export function searchRecordedApiCalls(records, input = {}) {
  const urlContains = String(input.urlContains ?? "").trim().toLowerCase();
  if (!urlContains) throw new Error("urlContainsを1文字以上指定してください");
  if (urlContains.length > 300) throw new Error("urlContainsは300文字以内で指定してください");
  const limit = normalizedLimit(input.limit);
  const matches = records
    .filter((record) => String(record.url ?? "").toLowerCase().includes(urlContains))
    .sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0));
  return {
    urlContains,
    totalMatches: matches.length,
    returned: Math.min(matches.length, limit),
    records: matches.slice(0, limit).map(metadataFor),
  };
}

export function serializeRecordedApiCall(record, maxBodyChars = MAX_WEBMCP_BODY_CHARS) {
  if (!record) throw new Error("指定された記録は見つかりません");
  const result = metadataFor(record);
  if (record.bodyEncoding !== "text") {
    return {
      ...result,
      body: null,
      truncated: false,
      note: "バイナリ本文はWebMCPでは返しません。ビューアーの個別エクスポートを使用してください。",
    };
  }
  const body = String(record.body ?? "");
  return {
    ...result,
    body: body.slice(0, maxBodyChars),
    truncated: body.length > maxBodyChars,
    note: "本文にはアカウント固有情報が含まれる可能性があります。ローカル解析以外へ転載しないでください。",
  };
}

export function createRecorderState({ apiCalls, assets, filters }) {
  return {
    status: "ready",
    counts: {
      apiCalls: apiCalls.length,
      assets: assets.length,
    },
    currentUrlFilters: [...filters],
    webMcpScope: "recorded-api-calls-read-only",
  };
}

export function registerRecorderWebMcpTools({
  modelContext,
  getRecorderState,
  searchApiCalls,
  getApiCall,
  onRegistrationError = () => undefined,
}) {
  if (typeof modelContext?.registerTool !== "function") return false;

  registerTool(modelContext, {
    name: "get_recorder_state",
    title: "レコーダー状態を取得",
    description: "ローカルに記録済みのAPIレスポンス・アセット件数と、ビューアーのURL絞り込み条件を読み取る。記録開始・停止や保存内容は変更しない。",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: READ_ONLY_ANNOTATIONS,
    execute: async () => getRecorderState(),
  }, onRegistrationError);

  registerTool(modelContext, {
    name: "search_recorded_api_calls",
    title: "記録済みAPIレスポンスを検索",
    description: "ユーザー操作によって既に記録されたAPIレスポンスをURL部分一致で検索し、本文を含まないメタデータを新しい順に返す。ゲームへの通信は発生しない。",
    inputSchema: {
      type: "object",
      properties: {
        urlContains: {
          type: "string",
          minLength: 1,
          maxLength: 300,
          description: "URLに含まれる文字列。大文字・小文字は区別しない。",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: MAX_SEARCH_RESULTS,
          default: DEFAULT_SEARCH_RESULTS,
        },
      },
      required: ["urlContains"],
      additionalProperties: false,
    },
    annotations: READ_ONLY_ANNOTATIONS,
    execute: async (input) => searchApiCalls(input),
  }, onRegistrationError);

  registerTool(modelContext, {
    name: "get_recorded_api_call",
    title: "記録済みAPIレスポンスを取得",
    description: "検索で得たrecordIdを指定し、ローカルに記録済みのAPIレスポンス1件を取得する。テキスト本文は最大200,000文字で、アカウント固有情報を含む可能性がある。ゲームへの通信は発生しない。",
    inputSchema: {
      type: "object",
      properties: {
        recordId: {
          type: "integer",
          minimum: 1,
          description: "search_recorded_api_callsが返したrecordId。",
        },
      },
      required: ["recordId"],
      additionalProperties: false,
    },
    annotations: READ_ONLY_ANNOTATIONS,
    execute: async (input) => getApiCall(input),
  }, onRegistrationError);

  return true;
}
