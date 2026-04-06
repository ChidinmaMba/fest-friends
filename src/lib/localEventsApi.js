import { apiUrl } from "./apiBase.js";

async function getJson(path, opts = {}) {
  // Only set JSON Content-Type when there is a body. Sending it on GET triggers a
  // CORS preflight on cross-origin requests; preflight must succeed for every API host.
  const headers = { ...opts.headers };
  if (opts.body != null) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }
  const res = await fetch(path, {
    ...opts,
    headers,
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
  return getJson(apiUrl("/api/users/me"), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listUpcomingEvents({ from } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return getJson(apiUrl(`/api/events${suffix}`));
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
  return getJson(apiUrl("/api/events"), {
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
  return getJson(apiUrl(`/api/events/${encodeURIComponent(eventId)}/rsvp`), {
    method: "PUT",
    body: JSON.stringify({ userId, status: "going" }),
  });
}

export async function rsvpRemove(eventId, { userId }) {
  return getJson(apiUrl(`/api/events/${encodeURIComponent(eventId)}/rsvp`), {
    method: "DELETE",
    body: JSON.stringify({ userId }),
  });
}

export async function listNearbyAttendees(eventId, { userId }) {
  const q = new URLSearchParams({ userId });
  return getJson(apiUrl(`/api/events/${encodeURIComponent(eventId)}/attendees?${q.toString()}`));
}

export async function fetchMyRsvpEventIds(userId) {
  return getJson(apiUrl(`/api/users/${encodeURIComponent(userId)}/rsvps`));
}

export async function fetchRecommendations(userId) {
  const q = new URLSearchParams({ userId });
  return getJson(apiUrl(`/api/recommendations?${q.toString()}`));
}

export async function sendMessage({ fromUserId, toUserId, body }) {
  return getJson(apiUrl("/api/messages"), {
    method: "POST",
    body: JSON.stringify({ fromUserId, toUserId, body }),
  });
}

export async function fetchUnreadMessageCount(userId) {
  const q = new URLSearchParams({ userId });
  return getJson(apiUrl(`/api/messages/unread?${q.toString()}`));
}

export async function fetchMessages(userId) {
  const q = new URLSearchParams({ userId });
  return getJson(apiUrl(`/api/messages?${q.toString()}`));
}

export async function markMessagesRead(userId) {
  return getJson(apiUrl("/api/messages/mark-read"), {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

