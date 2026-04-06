import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function openDb() {
  const dataDir = path.resolve(__dirname, "..", "data");
  ensureDir(dataDir);
  const dbPath = path.join(dataDir, "fest-friends.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      displayName TEXT,
      city TEXT,
      region TEXT,
      country TEXT,
      age INTEGER,
      race TEXT,
      personalityType TEXT,
      avatarUrl TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      eventId TEXT PRIMARY KEY,
      artistName TEXT NOT NULL,
      artistKey TEXT NOT NULL,
      showType TEXT NOT NULL CHECK (showType IN ('concert','festival')),
      showName TEXT,
      showNameKey TEXT NOT NULL,
      venueName TEXT,
      venueAddress TEXT NOT NULL DEFAULT '',
      showDate TEXT NOT NULL,
      createdByUserId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE (artistKey, showType, showNameKey, showDate)
    );

    CREATE TABLE IF NOT EXISTS rsvps (
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('going')),
      createdAt TEXT NOT NULL,
      PRIMARY KEY (eventId, userId),
      FOREIGN KEY (eventId) REFERENCES events(eventId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      messageId TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  let eventCols = db.prepare(`PRAGMA table_info(events)`).all();
  if (!eventCols.some((c) => c.name === "venueName")) {
    db.exec(`ALTER TABLE events ADD COLUMN venueName TEXT;`);
  }
  eventCols = db.prepare(`PRAGMA table_info(events)`).all();
  if (!eventCols.some((c) => c.name === "venueAddress")) {
    db.exec(`ALTER TABLE events ADD COLUMN venueAddress TEXT NOT NULL DEFAULT '';`);
  }

  let userCols = db.prepare(`PRAGMA table_info(users)`).all();
  if (!userCols.some((c) => c.name === "age")) {
    db.exec(`ALTER TABLE users ADD COLUMN age INTEGER;`);
  }
  userCols = db.prepare(`PRAGMA table_info(users)`).all();
  if (!userCols.some((c) => c.name === "race")) {
    db.exec(`ALTER TABLE users ADD COLUMN race TEXT;`);
  }
  userCols = db.prepare(`PRAGMA table_info(users)`).all();
  if (!userCols.some((c) => c.name === "personalityType")) {
    db.exec(`ALTER TABLE users ADD COLUMN personalityType TEXT;`);
  }
  userCols = db.prepare(`PRAGMA table_info(users)`).all();
  if (!userCols.some((c) => c.name === "avatarUrl")) {
    db.exec(`ALTER TABLE users ADD COLUMN avatarUrl TEXT;`);
  }

  let msgCols = db.prepare(`PRAGMA table_info(messages)`).all();
  if (!msgCols.some((c) => c.name === "readAt")) {
    db.exec(`ALTER TABLE messages ADD COLUMN readAt TEXT;`);
    db.exec(`UPDATE messages SET readAt = createdAt WHERE readAt IS NULL`);
  }
}

export function keyify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

