async function getJson(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.message || text || `${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

export async function upsertMe(payload) {
  return getJson("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listUpcomingEvents({ from } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return getJson(`/api/events${suffix}`);
}

export async function createEvent({
  userId,
  artistName,
  showType,
  showName,
  venueName,
  venueAddress,
  showDate,
}) {
  return getJson("/api/events", {
    method: "POST",
    body: JSON.stringify({
      userId,
      artistName,
      showType,
      showName,
      venueName,
      venueAddress,
      showDate,
    }),
  });
}

export async function rsvpGoing(eventId, { userId }) {
  return getJson(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: "PUT",
    body: JSON.stringify({ userId, status: "going" }),
  });
}

export async function rsvpRemove(eventId, { userId }) {
  return getJson(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: "DELETE",
    body: JSON.stringify({ userId }),
  });
}

export async function listNearbyAttendees(eventId, { userId }) {
  const q = new URLSearchParams({ userId });
  return getJson(`/api/events/${encodeURIComponent(eventId)}/attendees?${q.toString()}`);
}

export async function fetchMyRsvpEventIds(userId) {
  return getJson(`/api/users/${encodeURIComponent(userId)}/rsvps`);
}

export async function fetchRecommendations(userId) {
  const q = new URLSearchParams({ userId });
  return getJson(`/api/recommendations?${q.toString()}`);
}

export async function sendMessage({ fromUserId, toUserId, body }) {
  return getJson("/api/messages", {
    method: "POST",
    body: JSON.stringify({ fromUserId, toUserId, body }),
  });
}

