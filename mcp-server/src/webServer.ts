import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { convertDeckResponseToCalculatorDeckConfig } from "./calculator/calculatorDeckConfig.js";
import { calculateNormalAttackFromRequest } from "./calculator/normalAttackCalculationRequest.js";
import { createSelectableJobCatalog } from "./calculator/jobCatalogView.js";
import { createSelectableWeaponCatalog } from "./calculator/weaponCatalogView.js";
import { createSelectableSummonCatalog } from "./calculator/summonCatalogView.js";

const HOST = "127.0.0.1";
const requestedPort = Number.parseInt(process.env.GBF_CALCULATOR_PORT ?? "4173", 10);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535 ? requestedPort : 4173;
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const MAX_BODY_BYTES = 1_048_576;

const staticFiles: Record<string, { file: string; contentType: string }> = {
  "/": { file: "index.html", contentType: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", contentType: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", contentType: "text/javascript; charset=utf-8" },
  "/styles.css": { file: "styles.css", contentType: "text/css; charset=utf-8" },
};

function securityHeaders(response: ServerResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'");
}

function json(response: ServerResponse, status: number, body: unknown): void {
  securityHeaders(response);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw new Error("リクエストが1 MiBを超えています");
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new Error("JSONが空です");
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join(" / ");
  }
  return error instanceof Error ? error.message : "計算中に不明なエラーが発生しました";
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
    if (request.method === "GET" && url.pathname === "/api/catalog/weapons") {
      json(response, 200, createSelectableWeaponCatalog());
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/catalog/jobs") {
      json(response, 200, createSelectableJobCatalog());
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/catalog/summons") {
      json(response, 200, createSelectableSummonCatalog());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/calculate") {
      json(response, 200, calculateNormalAttackFromRequest(await readJsonBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/convert-deck") {
      json(response, 200, convertDeckResponseToCalculatorDeckConfig(await readJsonBody(request)));
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      json(response, 405, { error: "許可されていないメソッドです" });
      return;
    }
    const target = staticFiles[url.pathname];
    if (target === undefined) {
      json(response, 404, { error: "ページが見つかりません" });
      return;
    }
    const content = await readFile(path.join(WEB_ROOT, target.file));
    securityHeaders(response);
    response.writeHead(200, {
      "Content-Type": target.contentType,
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    json(response, 400, { error: errorMessage(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.error(`GBF Calculator: http://${HOST}:${PORT}`);
});
