import { debugAgentLog } from "./debugAgentLog";
import { getRedirectUri, getSpotifyClientId, SPOTIFY_SCOPES } from "./spotifyConfig";
import { createPkcePair } from "./spotifyPkce";
import {
  clearPkceVerifier,
  getPkceVerifier,
  getRefreshToken,
  saveTokenBundle,
  setPkceVerifier,
} from "./spotifySession";

const TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function startSpotifyLogin() {
  const clientId = getSpotifyClientId();
  if (!clientId) {
    return { ok: false, error: "Set VITE_SPOTIFY_CLIENT_ID in your .env file." };
  }
  const { verifier, challenge } = await createPkcePair();
  setPkceVerifier(verifier);
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.assign(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
  return { ok: true };
}

export async function exchangeCodeForTokens(code) {
  const clientId = getSpotifyClientId();
  const redirectUri = getRedirectUri();
  const codeVerifier = getPkceVerifier();
  // #region agent log
  debugAgentLog(
    "spotifyAuth.js:exchangeCodeForTokens:pre",
    "Before token POST",
    {
      redirectUri,
      clientIdLen: clientId.length,
      hasVerifier: Boolean(codeVerifier),
      verifierLen: codeVerifier?.length ?? 0,
      codeLen: typeof code === "string" ? code.length : 0,
    },
    "H2-H4"
  );
  // #endregion
  if (!codeVerifier) {
    throw new Error("Missing PKCE verifier. Start login again from this site.");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    // #region agent log
    debugAgentLog(
      "spotifyAuth.js:exchangeCodeForTokens:fetchCatch",
      "fetch to token URL threw",
      { errName: err?.name, errMessage: err?.message },
      "H1"
    );
    // #endregion
    throw err;
  }
  // #region agent log
  debugAgentLog(
    "spotifyAuth.js:exchangeCodeForTokens:response",
    "Token POST response",
    { status: res.status, ok: res.ok, type: res.type },
    "H1"
  );
  // #endregion
  try {
    if (!res.ok) {
      const text = await res.text();
      // #region agent log
      debugAgentLog(
        "spotifyAuth.js:exchangeCodeForTokens:notOk",
        "Token POST body (truncated)",
        { textHead: String(text).slice(0, 240) },
        "H2"
      );
      // #endregion
      throw new Error(text || "Could not exchange authorization code.");
    }
    const data = await res.json();
    saveTokenBundle(data);
    return data;
  } finally {
    clearPkceVerifier();
  }
}

export async function refreshAccessToken() {
  const clientId = getSpotifyClientId();
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token.");
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Could not refresh session.");
  }
  const data = await res.json();
  saveTokenBundle({
    ...data,
    refresh_token: data.refresh_token ?? refreshToken,
  });
  return data.access_token;
}
