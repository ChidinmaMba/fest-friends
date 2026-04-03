import { ensureAccessToken } from "./ensureAccessToken";
import { fetchCurrentUser, fetchTopArtists, fetchTopTracks } from "./spotifyWebApi";
import { buildTasteProfile } from "./tasteProfile";
import { saveTasteProfile, saveUser } from "./spotifySession";

export async function refreshTasteProfileFromSpotify() {
  const token = await ensureAccessToken();
  if (!token) {
    throw new Error("Session expired. Connect Spotify again.");
  }
  const [me, topArtists, topTracks] = await Promise.all([
    fetchCurrentUser(token),
    fetchTopArtists(token),
    fetchTopTracks(token),
  ]);
  const profile = buildTasteProfile(me, topArtists, topTracks);
  saveUser(me);
  saveTasteProfile(profile);
  return profile;
}
