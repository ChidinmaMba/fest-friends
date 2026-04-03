/**
 * Demo “people at your shows” rows until a real backend exists.
 * Deterministic from event id + user’s overlapping artist names.
 */

const FIRST = [
  "Alex",
  "Jordan",
  "Sam",
  "Riley",
  "Casey",
  "Morgan",
  "Quinn",
  "Avery",
  "Skyler",
  "Jamie",
  "Reese",
  "Drew",
];

const LAST = [
  "Nguyen",
  "Patel",
  "García",
  "Kim",
  "Silva",
  "Okafor",
  "Bakker",
  "Lind",
  "Park",
  "Reed",
  "Hayes",
  "Morales",
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function fakeName(seed) {
  const h = hashStr(seed);
  return `${FIRST[h % FIRST.length]} ${LAST[(h >> 4) % LAST.length]}`;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim();
}

/** Names from user taste profile that appear on an event lineup (case-insensitive). */
export function sharedArtistsForEvent(event, userArtistNames) {
  const set = new Set(userArtistNames.map(norm));
  const names = [
    ...new Set([
      ...(event.lineup || []),
      event.title,
      ...(event.matchedArtists || []),
    ]),
  ];
  const out = [];
  for (const n of names) {
    if (!set.has(norm(n))) continue;
    const canonical = userArtistNames.find((u) => norm(u) === norm(n));
    out.push(canonical || n);
  }
  return [...new Set(out)];
}

/**
 * Build mock attendees for events that share at least one artist with the user.
 */
export function buildMockShowMatches(events, userArtistNames, { maxPeople = 14 } = {}) {
  const rows = [];

  for (const ev of events) {
    const shared = sharedArtistsForEvent(ev, userArtistNames);
    if (shared.length === 0) continue;

    const count = 2 + (hashStr(ev.id) % 3);
    for (let i = 0; i < count; i += 1) {
      const seed = `${ev.id}-${i}`;
      rows.push({
        id: seed,
        displayName: fakeName(seed),
        eventId: ev.id,
        eventTitle: ev.title,
        datetime: ev.datetime,
        venueName: ev.venueName,
        city: ev.city,
        sharedArtists: shared.slice(0, 3),
      });
      if (rows.length >= maxPeople) return rows;
    }
  }

  return rows;
}
