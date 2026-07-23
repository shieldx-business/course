import { getToken, setToken, removeToken } from "./auth";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "";
const API_PREFIX = "/api/v1";

export const API_BASE = API_ORIGIN || "";

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_ORIGIN}${API_PREFIX}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function doFetch(path: string, options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_ORIGIN}${API_PREFIX}${path}`;
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  let res = await doFetch(path, options, token);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(path, options, newToken);
    } else {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  return res.json();
}
