/**
 * Returns the API base URL.
 * - In development (localhost): points to the Cloudflare Worker at port 8787
 * - In production: uses relative paths (Cloudflare Pages proxies /api/* to the Worker)
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname === "localhost" ? "http://localhost:8787" : "";
}
