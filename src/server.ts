import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = {
  ADMIN_PASSWORD?: string;
  ADMIN_USERNAME?: string;
  API_BASE_URL?: string;
  SESSION_SECRET?: string;
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

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const cookie of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = cookie.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return atob(padded);
}

async function signSession(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await signSessionBody(body, secret);
  return `${body}.${signature}`;
}

async function signSessionBody(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return base64UrlEncode(signature);
}

async function verifySession(token: string | undefined, secret: string): Promise<Record<string, unknown> | undefined> {
  if (!token || !token.includes(".")) return undefined;
  const [body] = token.split(".");
  const expected = `${body}.${await signSessionBody(body, secret)}`;
  if (expected !== token) return undefined;

  const payload = JSON.parse(base64UrlDecode(body)) as Record<string, unknown>;
  if (typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) return undefined;
  return payload;
}

async function createSimpleSession(username: string, secret: string): Promise<{ expiresAt: number; token: string }> {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12;
  const body = base64UrlEncode(`${username}:${expiresAt}`);
  const signature = await signSessionBody(body, secret);
  return { expiresAt, token: `${body}.${signature}` };
}

async function verifySimpleSession(token: string | undefined, secret: string): Promise<{ username: string; expiresAt: number } | undefined> {
  if (!token || !token.includes(".")) return undefined;
  const [body] = token.split(".");
  if (`${body}.${await signSessionBody(body, secret)}` !== token) return undefined;

  const [username, rawExpiresAt] = base64UrlDecode(body).split(":");
  const expiresAt = Number(rawExpiresAt);
  if (!username || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return undefined;
  return { username, expiresAt };
}

async function handleFallbackAuth(request: Request, env: RuntimeEnv): Promise<Response | undefined> {
  const url = new URL(request.url);
  const username = env.ADMIN_USERNAME || "admin";
  const password = env.ADMIN_PASSWORD || "";
  const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD || "dev-only-superadmin-secret";
  const cookieName = "superadmin_session";

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const session = await verifySimpleSession(getCookie(request, cookieName), secret);
    if (!session) {
      return Response.json({ authenticated: false, requiresPassword: Boolean(password) }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
    });
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!password || body.username !== username || body.password !== password) {
      return Response.json({ error: "Usuario ou senha invalidos" }, { status: 401 });
    }

    const session = await createSimpleSession(username, secret);

    return Response.json(
      { authenticated: true, username, expiresAt: session.expiresAt },
      {
        headers: {
          "set-cookie": `${cookieName}=${encodeURIComponent(session.token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`,
        },
      },
    );
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return Response.json(
      { authenticated: false },
      {
        headers: {
          "set-cookie": `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
        },
      },
    );
  }

  return undefined;
}

async function proxyApiRequest(request: Request, env: unknown): Promise<Response | undefined> {
  const apiBaseUrl = getApiBaseUrl(env);
  if (!isApiRequest(request)) return undefined;

  if (!apiBaseUrl) {
    const authResponse = await handleFallbackAuth(request, env as RuntimeEnv);
    if (authResponse) return authResponse;

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
