/**
 * Upcoming events for artists via Bandsintown public API.
 * @see https://help.artists.bandsintown.com/en/articles/9517592-api-terms-of-use
 */

function getBaseUrl() {
  if (import.meta.env.VITE_BANDSINTOWN_API_BASE) {
    return import.meta.env.VITE_BANDSINTOWN_API_BASE.replace(/\/$/, "");
  }
  return import.meta.env.DEV ? "/api/bandsintown" : "https://rest.bandsintown.com";
}

export function getBandsintownAppId() {
  return import.meta.env.VITE_BANDSINTOWN_APP_ID || "fest-friends";
}

function lineupNames(raw) {
  const lu = raw?.lineup ?? [];
  return lu
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean);
}

/** Normalize a single event for UI + matching. */
export function normalizeBandsintownEvent(raw) {
  const lineup = lineupNames(raw);
  const headliner =
    raw?.artist?.name ||
    raw?.artist?.title ||
    lineup[0] ||
    raw?.title ||
    "Live show";
  return {
    id: String(raw.id ?? `${raw.datetime}-${headliner}`),
    title: raw.title || headliner,
    datetime: raw.datetime,
    url: raw.url || null,
    venueName: raw.venue?.name || "Venue TBA",
    city: raw.venue?.city || "",
    region: raw.venue?.region || "",
    country: raw.venue?.country || "",
    lineup,
    festival: Boolean(raw.festival),
  };
}

export async function fetchArtistEvents(artistName) {
  const base = getBaseUrl();
  const appId = getBandsintownAppId();
  const path = `/artists/${encodeURIComponent(artistName)}/events`;
  // `upcoming` can omit far-future dates; `all` plus a local filter keeps every announced future show.
  const q = new URLSearchParams({ app_id: appId, date: "all" });
  const url = `${base}${path}?${q.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.slice(0, 200) || `Bandsintown ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const mapped = data.map(normalizeBandsintownEvent);
  const now = Date.now();
  return mapped.filter((ev) => {
    const t = ev.datetime ? Date.parse(ev.datetime) : NaN;
    if (Number.isNaN(t)) return true;
    return t >= now - 86_400_000;
  });
}

/**
 * Fetch upcoming events for several artist names; dedupe by id; sort ascending.
 */
export async function fetchUpcomingEventsForArtists(artistNames, { maxArtists = 8 } = {}) {
  const names = [...new Set(artistNames)]
    .filter(Boolean)
    .slice(0, maxArtists);
  const settled = await Promise.allSettled(
    names.map((name) =>
      fetchArtistEvents(name).then((list) =>
        list.map((ev) => ({
          ...ev,
          matchedArtists: [...(ev.matchedArtists || []), name],
        }))
      )
    )
  );
  const byId = new Map();
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const ev of s.value) {
      const prev = byId.get(ev.id);
      if (prev) {
        prev.matchedArtists = [
          ...new Set([...(prev.matchedArtists || []), ...(ev.matchedArtists || [])]),
        ];
      } else {
        byId.set(ev.id, ev);
      }
    }
  }
  const unique = [...byId.values()];
  unique.sort((a, b) => {
    const ta = Date.parse(a.datetime || 0) || 0;
    const tb = Date.parse(b.datetime || 0) || 0;
    return ta - tb;
  });
  return unique;
}
