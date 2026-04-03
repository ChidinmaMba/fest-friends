import { refreshAccessToken } from "./spotifyAuth";
import { getAccessToken, getExpiresAt } from "./spotifySession";

const SKEW_MS = 60_000;

export async function ensureAccessToken() {
  const token = getAccessToken();
  const expiresAt = getExpiresAt();
  if (!token) return null;
  if (Date.now() < expiresAt - SKEW_MS) return token;
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}
