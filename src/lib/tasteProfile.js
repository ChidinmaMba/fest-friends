/**
 * Build a taste profile from Spotify “top” endpoints for matching and display.
 * @param {object} me — /v1/me
 * @param {object} topArtists — /v1/me/top/artists
 * @param {object} topTracks — /v1/me/top/tracks
 */
export function buildTasteProfile(me, topArtists, topTracks) {
  const artists = topArtists?.items ?? [];
  const tracks = topTracks?.items ?? [];

  const genreWeights = new Map();
  artists.forEach((artist, index) => {
    const weight = Math.max(1, 50 - index);
    const genres = artist.genres ?? [];
    genres.forEach((g) => {
      genreWeights.set(g, (genreWeights.get(g) || 0) + weight);
    });
  });

  const genres = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  const topArtistSummaries = artists.slice(0, 12).map((a) => ({
    id: a.id,
    name: a.name,
    genres: a.genres ?? [],
    image: a.images?.[0]?.url ?? null,
    popularity: a.popularity,
  }));

  const topTrackSummaries = tracks.slice(0, 12).map((t) => ({
    id: t.id,
    name: t.name,
    artists: (t.artists ?? []).map((x) => x.name),
    album: t.album?.name ?? "",
    image: t.album?.images?.[0]?.url ?? null,
  }));

  const primaryGenres = genres.slice(0, 8).map((g) => g.name);
  const summary = summarizeTaste(primaryGenres, topArtistSummaries, topTrackSummaries);

  return {
    builtAt: new Date().toISOString(),
    timeRange: "medium_term",
    spotifyUserId: me.id,
    displayName: me.display_name,
    profileImage: me.images?.[0]?.url ?? null,
    genres,
    primaryGenres,
    topArtists: topArtistSummaries,
    topTracks: topTrackSummaries,
    summary,
  };
}

function summarizeTaste(primaryGenres, artists, tracks) {
  const g = primaryGenres.slice(0, 3);
  const artistNames = artists.slice(0, 3).map((a) => a.name);
  const parts = [];
  if (g.length) {
    parts.push(`Your listening leans toward ${formatList(g)}.`);
  }
  if (artistNames.length) {
    parts.push(`Top artists include ${formatList(artistNames)}.`);
  }
  if (tracks.length) {
    const t = tracks.slice(0, 2).map((x) => `“${x.name}”`);
    parts.push(`Standout tracks: ${formatList(t)}.`);
  }
  return parts.join(" ") || "Connect your Spotify to see your taste profile.";
}

function formatList(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
