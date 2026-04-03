const raw = import.meta.env.VITE_API_URL;
const API_ORIGIN =
  typeof raw === "string" && raw.trim() !== "" ? raw.trim().replace(/\/$/, "") : "";

/**
 * Absolute URL when `VITE_API_URL` is set (split deploy). Otherwise same-origin paths
 * like `/api/...` for local dev with the Vite proxy.
 */
export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_ORIGIN ? `${API_ORIGIN}${p}` : p;
}
