import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = {
  API_BASE_URL?: string;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

function getApiBaseUrl(env: unknown): string | undefined {
  const apiBaseUrl = (env as RuntimeEnv | undefined)?.API_BASE_URL;
  return apiBaseUrl ? apiBaseUrl.replace(/\/$/, "") : undefined;
}

function isApiRequest(request: Request): boolean {
  return new URL(request.url).pathname.startsWith("/api/");
}

async function proxyApiRequest(request: Request, env: unknown): Promise<Response | undefined> {
  const apiBaseUrl = getApiBaseUrl(env);
  if (!isApiRequest(request)) return undefined;

  if (!apiBaseUrl) {
    return Response.json(
      {
        error: "API_BASE_URL nao configurado",
        message: "Configure a URL publica da API Node nas variaveis do Worker.",
      },
      { status: 503 },
    );
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`${apiBaseUrl}${sourceUrl.pathname}${sourceUrl.search}`);
  const headers = new Headers(request.headers);
  headers.set("host", targetUrl.host);

  try {
    return await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  } catch {
    return Response.json(
      {
        error: "API indisponivel",
        message: "Nao foi possivel conectar na API Node configurada.",
      },
      { status: 502 },
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await proxyApiRequest(request, env);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
