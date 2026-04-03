import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { openDb, keyify } from "./db.js";

const PORT = Number(process.env.PORT || 8787);
const app = express();
const db = openDb();

app.use(cors());
app.use(express.json({ limit: "64kb" }));

function nowIso() {
  return new Date().toISOString();
}

function bad(res, status, message, details) {
  return res.status(status).json({ ok: false, message, details: details || null });
}

function requireString(v, name) {
  if (typeof v !== "string" || v.trim() === "") {
    const e = new Error(`${name} is required`);
    e.status = 400;
    throw e;
  }
  return v.trim();
}

function requireEnum(v, name, allowed) {
  if (!allowed.includes(v)) {
    const e = new Error(`${name} must be one of: ${allowed.join(", ")}`);
    e.status = 400;
    throw e;
  }
  return v;
}

function requireIsoDateish(v, name) {
  const s = requireString(v, name);
  const t = Date.parse(s);
  if (Number.isNaN(t)) {
    const e = new Error(`${name} must be a valid date`);
    e.status = 400;
    throw e;
  }
  return new Date(t).toISOString();
}

const RACE_VALUES = new Set([
  "american_indian_alaska_native",
  "asian",
  "black_african_american",
  "hispanic_latino",
  "native_hawaiian_pacific_islander",
  "white",
  "mixed",
  "other",
]);

const PERSONALITY_VALUES = new Set(["introvert", "extrovert", "ambivert"]);

function parseOptionalAge(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (Number.isNaN(n)) {
    const e = new Error("age must be a number");
    e.status = 400;
    throw e;
  }
  if (n < 13 || n > 120) {
    const e = new Error("age must be between 13 and 120");
    e.status = 400;
    throw e;
  }
  return n;
}

function parseOptionalRace(v) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (!RACE_VALUES.has(s)) {
    const e = new Error("race is invalid");
    e.status = 400;
    throw e;
  }
  return s;
}

function parseOptionalPersonality(v) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (!PERSONALITY_VALUES.has(s)) {
    const e = new Error("personalityType must be introvert, extrovert, or ambivert");
    e.status = 400;
    throw e;
  }
  return s;
}

/** Higher = better match for recommendations (traits + stable tie-break). */
function recommendationScore(me, other) {
  let s = 0;
  if (me.personalityType && other.personalityType && me.personalityType === other.personalityType) {
    s += 4;
  }
  if (me.race && other.race && me.race === other.race) {
    s += 2;
  }
  if (me.age != null && other.age != null) {
    const d = Math.abs(me.age - other.age);
    if (d <= 3) s += 3;
    else if (d <= 8) s += 1;
  }
  const name = String(other.displayName || other.userId || "");
  s += (name.charCodeAt(0) || 0) * 0.0001;
  return s;
}

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, now: nowIso() });
});

// Upsert user (Spotify userId = primary key) — merge partial PUT bodies
app.put("/api/users/me", (req, res) => {
  try {
    const userId = requireString(req.body?.userId, "userId");
    const body = req.body || {};

    const prev =
      db.prepare(
        `SELECT userId, displayName, city, region, country, age, race, personalityType, avatarUrl, createdAt
         FROM users WHERE userId = ?`
      ).get(userId) || null;

    let displayName = prev?.displayName ?? null;
    if ("displayName" in body) {
      displayName =
        typeof body.displayName === "string" && body.displayName.trim() !== ""
          ? body.displayName.trim()
          : null;
    }

    let city = prev?.city ?? null;
    if ("city" in body) {
      city = typeof body.city === "string" ? body.city.trim() : null;
    }
    let region = prev?.region ?? null;
    if ("region" in body) {
      region = typeof body.region === "string" ? body.region.trim() : null;
    }
    let country = prev?.country ?? null;
    if ("country" in body) {
      country = typeof body.country === "string" ? body.country.trim() : null;
    }

    let age = prev?.age ?? null;
    if ("age" in body) {
      age = parseOptionalAge(body.age);
    }

    let race = prev?.race ?? null;
    if ("race" in body) {
      race = parseOptionalRace(body.race);
    }

    let personalityType = prev?.personalityType ?? null;
    if ("personalityType" in body) {
      personalityType = parseOptionalPersonality(body.personalityType);
    }

    let avatarUrl = prev?.avatarUrl ?? null;
    if ("avatarUrl" in body) {
      avatarUrl =
        typeof body.avatarUrl === "string" && body.avatarUrl.trim() !== ""
          ? body.avatarUrl.trim()
          : null;
    }

    if (prev) {
      db.prepare(
        `UPDATE users SET
           displayName = ?,
           city = ?,
           region = ?,
           country = ?,
           age = ?,
           race = ?,
           personalityType = ?,
           avatarUrl = ?
         WHERE userId = ?`
      ).run(displayName, city, region, country, age, race, personalityType, avatarUrl, userId);
    } else {
      db.prepare(
        `INSERT INTO users (
           userId, displayName, city, region, country, age, race, personalityType, avatarUrl, createdAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        displayName,
        city,
        region,
        country,
        age,
        race,
        personalityType,
        avatarUrl,
        nowIso()
      );
    }

    const user = db
      .prepare(
        `SELECT userId, displayName, city, region, country, age, race, personalityType, avatarUrl
         FROM users WHERE userId = ?`
      )
      .get(userId);
    res.json({ ok: true, user });
  } catch (e) {
    return bad(res, e.status || 500, e.message || "Failed to save user.");
  }
});

app.get("/api/users/:userId", (req, res) => {
  const user = db
    .prepare(
      `SELECT userId, displayName, city, region, country, age, race, personalityType, avatarUrl
       FROM users WHERE userId = ?`
    )
    .get(req.params.userId);
  if (!user) return bad(res, 404, "User not found.");
  return res.json({ ok: true, user });
});

app.get("/api/users/:userId/rsvps", (req, res) => {
  const rows = db
    .prepare(`SELECT eventId FROM rsvps WHERE userId = ? AND status = 'going'`)
    .all(req.params.userId);
  res.json({ ok: true, eventIds: rows.map((r) => r.eventId) });
});

app.get("/api/recommendations", (req, res) => {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    if (!userId) return bad(res, 400, "userId is required.");

    const me = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(userId);
    if (!me) return bad(res, 404, "User not found.");
    if (!me.city && !me.region && !me.country) {
      return res.json({ ok: true, items: [], needLocation: true });
    }

    const myEventRows = db
      .prepare(`SELECT eventId FROM rsvps WHERE userId = ? AND status = 'going'`)
      .all(userId);
    const myEventIds = myEventRows.map((r) => r.eventId);
    if (myEventIds.length === 0) {
      return res.json({ ok: true, items: [], needRsvp: true });
    }

    const items = [];
    for (const eventId of myEventIds) {
      const ev = db
        .prepare(
          `SELECT eventId, artistName, showType, showName, venueName, venueAddress, showDate
           FROM events WHERE eventId = ?`
        )
        .get(eventId);
      if (!ev) continue;

      const candidates = db
        .prepare(
          `SELECT u.userId, u.displayName, u.city, u.region, u.country,
                  u.age, u.race, u.personalityType, u.avatarUrl
           FROM rsvps r
           JOIN users u ON u.userId = r.userId
           WHERE r.eventId = ?
             AND r.status = 'going'
             AND u.userId != ?
             AND COALESCE(u.city,'') = COALESCE(?, '')
             AND COALESCE(u.region,'') = COALESCE(?, '')
             AND COALESCE(u.country,'') = COALESCE(?, '')`
        )
        .all(eventId, userId, me.city, me.region, me.country);

      const scored = candidates
        .map((u) => ({ u, score: recommendationScore(me, u) }))
        .sort((a, b) => b.score - a.score || String(a.u.displayName).localeCompare(String(b.u.displayName)))
        .slice(0, 2);

      for (const { u } of scored) {
        items.push({ event: ev, person: u });
      }
    }

    items.sort((a, b) => Date.parse(a.event.showDate) - Date.parse(b.event.showDate));

    res.json({ ok: true, items });
  } catch (e) {
    return bad(res, e.status || 500, e.message || "Failed to load recommendations.");
  }
});

app.post("/api/messages", (req, res) => {
  try {
    const fromUserId = requireString(req.body?.fromUserId, "fromUserId");
    const toUserId = requireString(req.body?.toUserId, "toUserId");
    const text = requireString(req.body?.body, "body");
    if (text.length > 2000) {
      return bad(res, 400, "Message must be 2000 characters or less.");
    }
    const messageId = randomUUID();
    db.prepare(
      `INSERT INTO messages (messageId, fromUserId, toUserId, body, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    ).run(messageId, fromUserId, toUserId, text, nowIso());
    res.json({ ok: true, messageId });
  } catch (e) {
    return bad(res, e.status || 500, e.message || "Failed to send message.");
  }
});

// Create an event (unique by artist/type/name/date). If it already exists, return it.
app.post("/api/events", (req, res) => {
  try {
    const userId = requireString(req.body?.userId, "userId");
    const artistName = requireString(req.body?.artistName, "artistName");
    const showType = requireEnum(req.body?.showType, "showType", ["concert", "festival"]);
    const showName = typeof req.body?.showName === "string" ? req.body.showName.trim() : "";
    const venueName =
      typeof req.body?.venueName === "string" && req.body.venueName.trim() !== ""
        ? req.body.venueName.trim()
        : null;
    const venueAddress = requireString(req.body?.venueAddress, "venueAddress");
    const showDate = requireIsoDateish(req.body?.showDate, "showDate");

    const artistKey = keyify(artistName);
    const showNameKey = keyify(showName);

    // Ensure submitter exists
    db.prepare(
      `INSERT INTO users (userId, createdAt)
       VALUES (?, ?)
       ON CONFLICT(userId) DO NOTHING`
    ).run(userId, nowIso());

    const existing = db
      .prepare(
        `SELECT eventId, artistName, showType, showName, venueName, venueAddress, showDate, createdByUserId
         FROM events
         WHERE artistKey = ? AND showType = ? AND showNameKey = ? AND showDate = ?`
      )
      .get(artistKey, showType, showNameKey, showDate);
    if (existing) {
      return res.status(409).json({ ok: false, message: "Event already exists.", event: existing });
    }

    const eventId = randomUUID();
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO events (
        eventId, artistName, artistKey, showType, showName, showNameKey, venueName, venueAddress, showDate, createdByUserId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      eventId,
      artistName,
      artistKey,
      showType,
      showName || null,
      showNameKey,
      venueName,
      venueAddress,
      showDate,
      userId,
      createdAt
    );

    const event = db
      .prepare(
        `SELECT eventId, artistName, showType, showName, venueName, venueAddress, showDate, createdByUserId
         FROM events WHERE eventId = ?`
      )
      .get(eventId);
    return res.json({ ok: true, event });
  } catch (e) {
    return bad(res, e.status || 500, e.message || "Failed to create event.");
  }
});

app.get("/api/events", (req, res) => {
  const from = typeof req.query?.from === "string" ? req.query.from : null;
  const fromIso = from ? new Date(Date.parse(from)).toISOString() : null;
  const now = nowIso();
  const rows = db
    .prepare(
      `SELECT eventId, artistName, showType, showName, venueName, venueAddress, showDate, createdByUserId
       FROM events
       WHERE showDate >= COALESCE(?, ?)
       ORDER BY showDate ASC`
    )
    .all(fromIso, now);
  res.json({ ok: true, events: rows });
});

// RSVP (going)
app.put("/api/events/:eventId/rsvp", (req, res) => {
  try {
    const eventId = requireString(req.params.eventId, "eventId");
    const userId = requireString(req.body?.userId, "userId");
    const status = requireEnum(req.body?.status, "status", ["going"]);

    const ev = db.prepare("SELECT eventId FROM events WHERE eventId = ?").get(eventId);
    if (!ev) return bad(res, 404, "Event not found.");

    db.prepare(
      `INSERT INTO users (userId, createdAt)
       VALUES (?, ?)
       ON CONFLICT(userId) DO NOTHING`
    ).run(userId, nowIso());

    db.prepare(
      `INSERT INTO rsvps (eventId, userId, status, createdAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(eventId, userId) DO UPDATE SET status = excluded.status`
    ).run(eventId, userId, status, nowIso());

    res.json({ ok: true });
  } catch (e) {
    return bad(res, e.status || 500, e.message || "Failed to RSVP.");
  }
});

app.delete("/api/events/:eventId/rsvp", (req, res) => {
  try {
    const eventId = requireString(req.params.eventId, "eventId");
    const userId = requireString(req.body?.userId, "userId");
    db.prepare("DELETE FROM rsvps WHERE eventId = ? AND userId = ?").run(eventId, userId);
    res.json({ ok: true });
  } catch (e) {
    return bad(res, e.status || 500, e.message || "Failed to remove RSVP.");
  }
});

// Attendees in the same area as the requesting user (city/region/country exact match)
app.get("/api/events/:eventId/attendees", (req, res) => {
  const eventId = req.params.eventId;
  const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
  if (!userId) return bad(res, 400, "userId is required.");

  const me = db
    .prepare("SELECT city, region, country FROM users WHERE userId = ?")
    .get(userId);
  if (!me) return bad(res, 404, "Requesting user not found.");
  if (!me.city && !me.region && !me.country) {
    return res.json({ ok: true, attendees: [], area: null });
  }

  const attendees = db
    .prepare(
      `SELECT u.userId, u.displayName, u.city, u.region, u.country,
              u.age, u.race, u.personalityType, u.avatarUrl
       FROM rsvps r
       JOIN users u ON u.userId = r.userId
       WHERE r.eventId = ?
         AND r.status = 'going'
         AND u.userId != ?
         AND COALESCE(u.city,'') = COALESCE(?, '')
         AND COALESCE(u.region,'') = COALESCE(?, '')
         AND COALESCE(u.country,'') = COALESCE(?, '')
       ORDER BY u.displayName ASC`
    )
    .all(eventId, userId, me.city, me.region, me.country);

  res.json({ ok: true, attendees, area: me });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[fest-friends] API listening on http://127.0.0.1:${PORT}`);
});

