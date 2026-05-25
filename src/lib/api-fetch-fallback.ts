const FALLBACK_INSTALLED_KEY = "__superadminApiFetchFallbackInstalled";
const FALLBACK_API_STORAGE_KEYS = ["superadminApiBaseUrl", "superadmin.apiBaseUrl"];
const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:3001";

type WindowWithApiFallback = Window &
  typeof globalThis & {
    [FALLBACK_INSTALLED_KEY]?: boolean;
  };

function normalizeBaseUrl(value: string | null | undefined): string | undefined {
  const trimmed = String(value || "").trim().replace(/\/$/, "");
  return trimmed || undefined;
}

function getFallbackBaseUrls(): string[] {
  const urls = new Set<string>();

  for (const key of FALLBACK_API_STORAGE_KEYS) {
    urls.add(normalizeBaseUrl(window.localStorage.getItem(key)) || "");
  }

  urls.add(DEFAULT_LOCAL_API_BASE_URL);
  urls.delete("");

  return [...urls];
}

function getSameOriginApiPath(input: RequestInfo | URL): string | undefined {
  const rawUrl = input instanceof Request ? input.url : String(input);
  const url = new URL(rawUrl, window.location.href);

  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
    return undefined;
  }

  return `${url.pathname}${url.search}`;
}

async function isRetryableWorkerResponse(response: Response, apiPath: string): Promise<boolean> {
  try {
    const payload = (await response.clone().json()) as {
      authenticated?: unknown;
      error?: unknown;
      requiresPassword?: unknown;
    };

    if (response.status === 503 && payload.error === "API_BASE_URL nao configurado") {
      return true;
    }

    return (
      response.status === 401 &&
      apiPath === "/api/auth/me" &&
      payload.authenticated === false &&
      payload.requiresPassword === false
    );
  } catch {
    return false;
  }
}

export function installApiFetchFallback() {
  if (typeof window === "undefined") return;

  const globalWindow = window as WindowWithApiFallback;
  if (globalWindow[FALLBACK_INSTALLED_KEY]) return;
  globalWindow[FALLBACK_INSTALLED_KEY] = true;

  const originalFetch = globalWindow.fetch.bind(globalWindow);

  globalWindow.fetch = async (input, init) => {
    const apiPath = getSameOriginApiPath(input);
    const response = await originalFetch(input, init);

    if (!apiPath || !(await isRetryableWorkerResponse(response, apiPath))) {
      return response;
    }

    for (const baseUrl of getFallbackBaseUrls()) {
      try {
        const fallbackResponse = await originalFetch(`${baseUrl}${apiPath}`, init);
        if (fallbackResponse.status !== 404) return fallbackResponse;
      } catch {
        // Keep the original Worker error if no local/public API fallback is reachable.
      }
    }

    return response;
  };
}
