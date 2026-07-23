import { getToken } from "./auth";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "";
const API_PREFIX = "/api/v1";

export const API_BASE = API_ORIGIN || "";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_ORIGIN}${API_PREFIX}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  return res.json();
}
