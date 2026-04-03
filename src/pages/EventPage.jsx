import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { listNearbyAttendees, listUpcomingEvents } from "../lib/localEventsApi";
import { useSpotifySession } from "../hooks/useSpotifySession";
import { formatPersonality, formatRace } from "../lib/profileOptions";

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

function hashStr(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const FIRST = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Quinn", "Avery", "Jamie", "Reese"];
const LAST = ["Nguyen", "Patel", "García", "Kim", "Silva", "Okafor", "Lind", "Park", "Reed", "Morales"];

function fakeUsersForEvent(eventId, { count = 8 } = {}) {
  const out = [];
  const base = hashStr(eventId);
  for (let i = 0; i < count; i += 1) {
    const h = hashStr(`${eventId}-${base}-${i}`);
    const displayName = `${FIRST[h % FIRST.length]} ${LAST[(h >> 4) % LAST.length]}`;
    out.push({
      userId: `fake_${eventId.slice(0, 6)}_${i}`,
      displayName,
    });
  }
  return out;
}

export default function EventPage() {
  const { loggedIn, user, taste } = useSpotifySession();
  const userId = taste?.spotifyUserId || user?.id || null;
  const { eventId } = useParams();
  const location = useLocation();
  const passedEvent = location.state?.event || null;

  const [event, setEvent] = useState(passedEvent);
  const [loadingEvent, setLoadingEvent] = useState(!passedEvent);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [error, setError] = useState(null);
  const [area, setArea] = useState(null);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    if (!loggedIn) return;
    if (passedEvent) return;
    let cancelled = false;
    setLoadingEvent(true);
    (async () => {
      try {
        const r = await listUpcomingEvents();
        const found = (r.events || []).find((x) => x.eventId === eventId) || null;
        if (!cancelled) setEvent(found);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load event.");
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, eventId, passedEvent]);

  const fakeAttendees = useMemo(() => fakeUsersForEvent(eventId || "event", { count: 10 }), [eventId]);

  useEffect(() => {
    if (!loggedIn || !userId || !eventId) return;
    let cancelled = false;
    setLoadingPeople(true);
    setError(null);
    (async () => {
      try {
        const r = await listNearbyAttendees(eventId, { userId });
        if (cancelled) return;
        setArea(r.area || null);
        setAttendees(r.attendees || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load attendees.");
        setAttendees([]);
      } finally {
        if (!cancelled) setLoadingPeople(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, userId, eventId]);

  if (!loggedIn) return <Navigate to="/profile" replace />;

  return (
    <main className="wrap account-page">
      <header className="account-header">
        <div>
          <h1 className="account-title">Who’s going</h1>
          <p className="account-sub">Fest Friends in your area attending the same show.</p>
        </div>
        <Link className="btn btn-secondary btn-sm" to="/account">
          Back to account
        </Link>
      </header>

      <div className="account-grid">
        <section className="account-widget" aria-labelledby="event-heading">
          <div className="account-widget-head">
            <h2 id="event-heading">Event</h2>
          </div>
          {loadingEvent ? (
            <p className="account-muted">Loading event…</p>
          ) : !event ? (
            <p className="taste-error" role="alert">
              Event not found.
            </p>
          ) : (
            <div className="account-show-card">
              <div className="account-show-main">
                <strong className="account-show-title">{event.artistName}</strong>
                <span className="account-show-meta">
                  {event.showDate ? new Date(event.showDate).toLocaleDateString() : ""}
                  {event.showType ? ` · ${event.showType}` : ""}
                </span>
                {event.venueName ? (
                  <span className="account-show-venue">{event.venueName}</span>
                ) : null}
                {event.venueAddress ? (
                  <span className="account-show-meta" style={{ display: "block", marginTop: "0.15rem" }}>
                    {event.venueAddress}
                  </span>
                ) : null}
                {event.showName ? (
                  <span className="account-show-meta" style={{ display: "block", marginTop: "0.2rem" }}>
                    {event.showName}
                  </span>
                ) : null}
                {!event.venueName && !event.venueAddress && !event.showName ? (
                  <span className="account-show-venue">—</span>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="account-widget" aria-labelledby="people-heading">
          <div className="account-widget-head">
            <h2 id="people-heading">People in your area</h2>
            <p className="account-widget-desc">
              {area?.city || area?.region || area?.country
                ? `Matching ${[area?.city, area?.region, area?.country].filter(Boolean).join(", ")}`
                : "Set your area on the account page for local matching."}
            </p>
          </div>

          {error ? (
            <p className="taste-error" role="alert">
              {error}
            </p>
          ) : null}

          {loadingPeople ? (
            <p className="account-muted">Loading people…</p>
          ) : (
            <>
              <p className="account-demo-banner">
                Sample users for now — these will be replaced with real attendees once more people RSVP.
              </p>
              <ul className="account-people-list">
                {[...(attendees || []), ...fakeAttendees].slice(0, 12).map((a) => (
                  <li key={a.userId} className="account-person-card">
                    <div
                      className="account-person-avatar"
                      aria-hidden="true"
                      style={{
                        background: `hsl(${(a.userId.charCodeAt(0) * 47) % 360} 42% 36%)`,
                      }}
                    >
                      {initials(a.displayName || a.userId)}
                    </div>
                    <div className="account-person-body">
                      <strong>{a.displayName || "Fest Friend"}</strong>
                      {"city" in a ? (
                        <span className="account-person-meta">
                          {a.city ? `${a.city}` : ""}
                          {a.region ? `, ${a.region}` : ""}
                          {a.country ? ` · ${a.country}` : ""}
                        </span>
                      ) : null}
                      {a.age != null || a.race || a.personalityType ? (
                        <span className="account-person-traits">
                          {[a.age != null ? `${a.age} yrs` : null, formatRace(a.race), formatPersonality(a.personalityType)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

