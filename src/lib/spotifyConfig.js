/** Spotify app settings (https://developer.spotify.com/dashboard) */
export function getSpotifyClientId() {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
}

/** Must match a redirect URI registered on your Spotify app exactly. */
export function getRedirectUri() {
  const fromEnv = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  if (fromEnv) return fromEnv;
  return `${window.location.origin}/callback`;
}

export const SPOTIFY_SCOPES = ["user-top-read", "user-read-email"].join(" ");
