const API = "https://api.spotify.com/v1";

async function getJson(path, accessToken) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) {
    const err = new Error("UNAUTHORIZED");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${path}`);
  }
  return res.json();
}

export function fetchCurrentUser(accessToken) {
  return getJson("/me", accessToken);
}

export function fetchTopArtists(accessToken, { limit = 50, timeRange = "medium_term" } = {}) {
  const q = new URLSearchParams({ limit: String(limit), time_range: timeRange });
  return getJson(`/me/top/artists?${q}`, accessToken);
}

export function fetchTopTracks(accessToken, { limit = 50, timeRange = "medium_term" } = {}) {
  const q = new URLSearchParams({ limit: String(limit), time_range: timeRange });
  return getJson(`/me/top/tracks?${q}`, accessToken);
}
