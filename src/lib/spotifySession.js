const K = {
  verifier: "ff_spotify_pkce_verifier",
  access: "ff_spotify_access_token",
  refresh: "ff_spotify_refresh_token",
  expiresAt: "ff_spotify_expires_at",
  user: "ff_spotify_user",
  taste: "ff_spotify_taste_profile",
};

export function getPkceVerifier() {
  return sessionStorage.getItem(K.verifier);
}

export function setPkceVerifier(v) {
  sessionStorage.setItem(K.verifier, v);
}

export function clearPkceVerifier() {
  sessionStorage.removeItem(K.verifier);
}

export function saveTokenBundle({ access_token, refresh_token, expires_in }) {
  sessionStorage.setItem(K.access, access_token);
  if (refresh_token) sessionStorage.setItem(K.refresh, refresh_token);
  const expiresAt = Date.now() + expires_in * 1000;
  sessionStorage.setItem(K.expiresAt, String(expiresAt));
}

export function getRefreshToken() {
  return sessionStorage.getItem(K.refresh);
}

export function getAccessToken() {
  return sessionStorage.getItem(K.access);
}

export function getExpiresAt() {
  const raw = sessionStorage.getItem(K.expiresAt);
  return raw ? Number(raw) : 0;
}

export function saveUser(user) {
  sessionStorage.setItem(K.user, JSON.stringify(user));
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(K.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTasteProfile(profile) {
  sessionStorage.setItem(K.taste, JSON.stringify(profile));
}

export function getTasteProfile() {
  const raw = sessionStorage.getItem(K.taste);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSpotifySession() {
  Object.values(K).forEach((key) => sessionStorage.removeItem(key));
}

export function hasSpotifySession() {
  return Boolean(getAccessToken() && getStoredUser());
}
