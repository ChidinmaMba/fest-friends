import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSpotifySession } from "../hooks/useSpotifySession";
import MessageModal from "../components/MessageModal";
import {
  createEvent,
  fetchMyRsvpEventIds,
  fetchRecommendations,
  listNearbyAttendees,
  listUpcomingEvents,
  rsvpGoing,
  rsvpRemove,
  upsertMe,
} from "../lib/localEventsApi";
import { formatPersonality, formatRace, PERSONALITY_OPTIONS, RACE_OPTIONS } from "../lib/profileOptions";

function formatShowDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

function formatShowSummary(ev, formatDate) {
  const bits = [ev.artistName];
  if (ev.showDate) bits.push(formatDate(ev.showDate));
  if (ev.venueName) bits.push(ev.venueName);
  return bits.join(" · ");
}

export default function AccountPage() {
  const { loggedIn, user, taste } = useSpotifySession();
  const userId = taste?.spotifyUserId || user?.id || null;

  const [events, setEvents] = useState([]);
  const [loadingShows, setLoadingShows] = useState(true);
  const [showsError, setShowsError] = useState(null);

  const [me, setMe] = useState(null);
  const [savingMe, setSavingMe] = useState(false);
  const [meError, setMeError] = useState(null);

  const [traits, setTraits] = useState({ age: "", race: "", personalityType: "" });
  const [savingTraits, setSavingTraits] = useState(false);
  const [traitsError, setTraitsError] = useState(null);

  const [form, setForm] = useState({
    artistName: "",
    showType: "concert",
    showName: "",
    venueName: "",
    venueAddress: "",
    showDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [goingIds, setGoingIds] = useState(() => new Set());
  const [attendeesByEventId, setAttendeesByEventId] = useState(() => new Map());

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [recsError, setRecsError] = useState(null);
  const [recNeedLocation, setRecNeedLocation] = useState(false);
  const [recNeedRsvp, setRecNeedRsvp] = useState(false);
  const [dmRecipient, setDmRecipient] = useState(null);

  useEffect(() => {
    if (!loggedIn || !userId) return;
    let cancelled = false;
    setSavingMe(true);
    setMeError(null);
    upsertMe({
      userId,
      displayName: user?.display_name || taste?.displayName || null,
      avatarUrl: user?.images?.[0]?.url ?? null,
    })
      .then((r) => {
        if (!cancelled) setMe(r.user || null);
      })
      .catch((e) => {
        if (!cancelled) setMeError(e instanceof Error ? e.message : "Could not load your profile.");
      })
      .finally(() => {
        if (!cancelled) setSavingMe(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loggedIn, userId, user?.display_name, taste?.displayName]);

  useEffect(() => {
    if (!me) return;
    setTraits({
      age: me.age != null && me.age !== "" ? String(me.age) : "",
      race: me.race || "",
      personalityType: me.personalityType || "",
    });
  }, [me]);

  const refreshEvents = useMemo(() => {
    return async () => {
      setLoadingShows(true);
      setShowsError(null);
      try {
        const r = await listUpcomingEvents();
        setEvents(r.events || []);
      } catch (e) {
        setShowsError(e instanceof Error ? e.message : "Could not load events.");
        setEvents([]);
      } finally {
        setLoadingShows(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    refreshEvents();
  }, [loggedIn, refreshEvents]);

  useEffect(() => {
    if (!loggedIn || !userId) return;
    let cancelled = false;
    fetchMyRsvpEventIds(userId)
      .then((r) => {
        if (!cancelled) setGoingIds(new Set(r.eventIds || []));
      })
      .catch(() => {
        if (!cancelled) setGoingIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, userId]);

  const goingKey = [...goingIds].sort().join("|");

  useEffect(() => {
    if (!loggedIn || !userId) return;
    let cancelled = false;
    setLoadingRecs(true);
    setRecsError(null);
    fetchRecommendations(userId)
      .then((r) => {
        if (!cancelled) {
          setRecommendations(r.items || []);
          setRecNeedLocation(Boolean(r.needLocation));
          setRecNeedRsvp(Boolean(r.needRsvp));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setRecsError(e instanceof Error ? e.message : "Could not load recommendations.");
          setRecommendations([]);
          setRecNeedLocation(false);
          setRecNeedRsvp(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRecs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    loggedIn,
    userId,
    goingKey,
    me?.city,
    me?.region,
    me?.country,
    me?.personalityType,
    me?.race,
    me?.age,
  ]);

  if (!loggedIn) {
    return <Navigate to="/profile" replace />;
  }

  async function onSaveLocation(e) {
    e.preventDefault();
    if (!userId) return;
    setSavingMe(true);
    setMeError(null);
    try {
      const r = await upsertMe({
        userId,
        displayName: user?.display_name || taste?.displayName || null,
        city: e.currentTarget.city.value,
        region: e.currentTarget.region.value,
        country: e.currentTarget.country.value,
      });
      setMe(r.user || null);
    } catch (err) {
      setMeError(err instanceof Error ? err.message : "Could not save location.");
    } finally {
      setSavingMe(false);
    }
  }

  async function onSaveTraits(e) {
    e.preventDefault();
    if (!userId) return;
    setSavingTraits(true);
    setTraitsError(null);
    try {
      const ageTrim = traits.age.trim();
      const r = await upsertMe({
        userId,
        displayName: user?.display_name || taste?.displayName || null,
        age: ageTrim === "" ? null : ageTrim,
        race: traits.race || null,
        personalityType: traits.personalityType || null,
      });
      setMe(r.user || null);
    } catch (err) {
      setTraitsError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSavingTraits(false);
    }
  }

  async function onSubmitEvent(e) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await createEvent({
        userId,
        artistName: form.artistName,
        showType: form.showType,
        showName: form.showName,
        venueName: form.venueName,
        venueAddress: form.venueAddress,
        showDate: form.showDate,
      });
      const ev = r.event;
      setForm({
        artistName: "",
        showType: "concert",
        showName: "",
        venueName: "",
        venueAddress: "",
        showDate: "",
      });
      await refreshEvents();
      // Auto-mark submitter as going.
      if (ev?.eventId) {
        await rsvpGoing(ev.eventId, { userId });
        setGoingIds((prev) => new Set([...prev, ev.eventId]));
      }
    } catch (err) {
      // If event exists, show a friendly message (409).
      setSubmitError(err instanceof Error ? err.message : "Could not create event.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleGoing(eventId) {
    if (!userId) return;
    const next = new Set(goingIds);
    const isGoing = next.has(eventId);
    try {
      if (isGoing) {
        await rsvpRemove(eventId, { userId });
        next.delete(eventId);
      } else {
        await rsvpGoing(eventId, { userId });
        next.add(eventId);
      }
      setGoingIds(next);
      if (!isGoing) {
        const r = await listNearbyAttendees(eventId, { userId });
        setAttendeesByEventId((prev) => {
          const m = new Map(prev);
          m.set(eventId, r.attendees || []);
          return m;
        });
      }
    } catch (err) {
      setShowsError(err instanceof Error ? err.message : "Could not update RSVP.");
    }
  }

  return (
    <main className="wrap account-page">
      <header className="account-header">
        <div className="account-user">
          {user?.images?.[0]?.url ? (
            <img
              className="account-avatar"
              src={user.images[0].url}
              alt=""
              width={72}
              height={72}
            />
          ) : (
            <div className="account-avatar-fallback" aria-hidden="true">
              {initials(user?.display_name || "You")}
            </div>
          )}
          <div>
            <h1 className="account-title">
              {user?.display_name ? `${user.display_name}` : "Your account"}
            </h1>
            <p className="account-sub">
              Concerts & festivals tied to your Spotify taste — plus people
              heading to the same lineups.
            </p>
          </div>
        </div>
        <Link className="btn btn-secondary btn-sm" to="/profile">
          Taste profile
        </Link>
      </header>

      <section className="recommend-section" aria-labelledby="rec-heading">
        <div className="recommend-section-head">
          <h2 id="rec-heading" className="recommend-section-title">
            Recommended for you
          </h2>
          <p className="recommend-section-desc">
            Up to two people per show you’re going to — same city, ranked by your profile traits.
          </p>
        </div>
        {loadingRecs ? (
          <p className="account-muted">Finding people…</p>
        ) : recsError ? (
          <p className="taste-error" role="alert">
            {recsError}
          </p>
        ) : recNeedLocation ? (
          <p className="account-muted">Set your city in the area widget below to see people near you.</p>
        ) : recNeedRsvp ? (
          <p className="account-muted">
            RSVP to shows you’re planning to attend — we’ll suggest fans going to the same concerts.
          </p>
        ) : recommendations.length === 0 ? (
          <p className="account-muted">
            No matches yet. When more Fest Friends in your area join the same shows, they’ll show up here.
          </p>
        ) : (
          <ul className="recommend-list">
            {recommendations.map((item) => (
              <li key={`${item.event.eventId}-${item.person.userId}`}>
                <article className="recommend-card">
                  <div className="recommend-card-photo">
                    {item.person.avatarUrl ? (
                      <img
                        className="recommend-card-img"
                        src={item.person.avatarUrl}
                        alt=""
                        width={56}
                        height={56}
                      />
                    ) : (
                      <div className="recommend-card-fallback" aria-hidden="true">
                        {initials(item.person.displayName || "?")}
                      </div>
                    )}
                  </div>
                  <div className="recommend-card-body">
                    <strong className="recommend-card-name">{item.person.displayName || "Fest Friend"}</strong>
                    <span className="recommend-card-age">
                      {item.person.age != null ? `${item.person.age} years old` : "Age not shared"}
                    </span>
                    <span className="recommend-card-show">
                      {formatShowSummary(item.event, formatShowDate)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary recommend-card-dm"
                    onClick={() => setDmRecipient(item.person)}
                  >
                    Message
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="account-grid">
        <section className="account-widget" aria-labelledby="shows-heading">
          <div className="account-widget-head">
            <h2 id="shows-heading">Upcoming shows</h2>
            <p className="account-widget-desc">
              Community-submitted events (concerts + festivals). Create one, then mark that you’re going.
            </p>
          </div>

          <form className="account-form account-form--events" onSubmit={onSubmitEvent}>
            <div className="account-form-grid account-form-grid--split">
              <label className="account-field">
                <span className="account-field-label">Artist</span>
                <input
                  className="account-field-input"
                  value={form.artistName}
                  onChange={(e) => setForm((p) => ({ ...p, artistName: e.target.value }))}
                  placeholder="e.g. Carly Cosgrove"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="account-field account-field--type">
                <span className="account-field-label">Type</span>
                <select
                  className="account-field-input account-field-input--select"
                  value={form.showType}
                  onChange={(e) => setForm((p) => ({ ...p, showType: e.target.value }))}
                >
                  <option value="concert">Concert</option>
                  <option value="festival">Festival</option>
                </select>
              </label>
            </div>
            <div className="account-form-grid">
              <label className="account-field">
                <span className="account-field-label">Show name · optional</span>
                <input
                  className="account-field-input"
                  value={form.showName}
                  onChange={(e) => setForm((p) => ({ ...p, showName: e.target.value }))}
                  placeholder="Tour or festival title"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="account-form-grid">
              <label className="account-field">
                <span className="account-field-label">Venue · optional</span>
                <input
                  className="account-field-input"
                  value={form.venueName}
                  onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))}
                  placeholder="e.g. Franklin Music Hall"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="account-form-grid">
              <label className="account-field">
                <span className="account-field-label">Venue address</span>
                <textarea
                  className="account-field-input account-field-input--textarea"
                  value={form.venueAddress}
                  onChange={(e) => setForm((p) => ({ ...p, venueAddress: e.target.value }))}
                  placeholder="Street, city, ZIP — whatever helps people find the place"
                  rows={3}
                  required
                  autoComplete="street-address"
                />
              </label>
            </div>
            <div className="account-form-actions">
              <label className="account-field account-field--date">
                <span className="account-field-label">Date</span>
                <input
                  className="account-field-input account-field-input--date"
                  type="date"
                  value={form.showDate}
                  onChange={(e) => setForm((p) => ({ ...p, showDate: e.target.value }))}
                  required
                />
              </label>
              <button
                className="btn btn-primary account-form-submit"
                type="submit"
                disabled={submitting || !userId}
              >
                {submitting ? "Posting…" : "Post event"}
              </button>
            </div>
            {submitError ? (
              <p className="taste-error" role="alert">
                {submitError}
              </p>
            ) : null}
            {!userId ? (
              <p className="account-muted">Finish Spotify login to post events.</p>
            ) : null}
          </form>

          {loadingShows ? (
            <p className="account-muted">Loading shows…</p>
          ) : showsError ? (
            <p className="taste-error" role="alert">
              {showsError}
            </p>
          ) : events.length === 0 ? (
            <p className="account-muted">
              No upcoming events yet. Be the first to post one.
            </p>
          ) : (
            <ul className="account-show-list">
              {events.map((ev) => (
                <li key={ev.eventId} className="account-show-card">
                  <Link
                    to={`/events/${ev.eventId}`}
                    state={{ event: ev }}
                    className="account-show-main"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <strong className="account-show-title">{ev.artistName}</strong>
                    <span className="account-show-meta">
                      {formatShowDate(ev.showDate)}
                      {ev.showType ? ` · ${ev.showType}` : ""}
                    </span>
                    {ev.venueName ? (
                      <span className="account-show-venue">{ev.venueName}</span>
                    ) : null}
                    {ev.venueAddress ? (
                      <span className="account-show-meta" style={{ display: "block", marginTop: "0.15rem" }}>
                        {ev.venueAddress}
                      </span>
                    ) : null}
                    {ev.showName ? (
                      <span className="account-show-meta" style={{ display: "block", marginTop: "0.2rem" }}>
                        {ev.showName}
                      </span>
                    ) : null}
                    {!ev.venueName && !ev.venueAddress && !ev.showName ? (
                      <span className="account-show-venue">—</span>
                    ) : null}
                  </Link>
                  <button
                    className="account-outlink"
                    type="button"
                    onClick={() => toggleGoing(ev.eventId)}
                    disabled={!userId}
                  >
                    {goingIds.has(ev.eventId) ? "Going ✓" : "I’m going"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="account-widget" aria-labelledby="traits-heading">
          <div className="account-widget-head">
            <h2 id="traits-heading">About you</h2>
            <p className="account-widget-desc">
              Optional — used to suggest people in your city at the same shows. Tied to your Spotify account
              ID.
            </p>
          </div>
          <form className="account-form account-form--events" onSubmit={onSaveTraits}>
            <div className="account-form-grid account-form-grid--split">
              <label className="account-field">
                <span className="account-field-label">Age · optional</span>
                <input
                  className="account-field-input"
                  type="number"
                  min={13}
                  max={120}
                  inputMode="numeric"
                  value={traits.age}
                  onChange={(e) => setTraits((p) => ({ ...p, age: e.target.value }))}
                  placeholder="e.g. 24"
                />
              </label>
              <label className="account-field account-field--type">
                <span className="account-field-label">Personality</span>
                <select
                  className="account-field-input account-field-input--select"
                  value={traits.personalityType}
                  onChange={(e) => setTraits((p) => ({ ...p, personalityType: e.target.value }))}
                >
                  {PERSONALITY_OPTIONS.map((o) => (
                    <option key={`personality-${o.value || "unspecified"}`} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="account-form-grid">
              <label className="account-field">
                <span className="account-field-label">Race / ethnicity · optional</span>
                <select
                  className="account-field-input account-field-input--select"
                  value={traits.race}
                  onChange={(e) => setTraits((p) => ({ ...p, race: e.target.value }))}
                >
                  {RACE_OPTIONS.map((o) => (
                    <option key={`race-${o.value || "unspecified"}`} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="account-form-actions account-form-actions--traits">
              <button
                className="btn btn-secondary account-form-submit"
                type="submit"
                disabled={savingTraits || !userId}
              >
                {savingTraits ? "Saving…" : "Save profile traits"}
              </button>
            </div>
            {traitsError ? (
              <p className="taste-error" role="alert">
                {traitsError}
              </p>
            ) : null}
          </form>
        </section>

        <section className="account-widget" aria-labelledby="people-heading">
          <div className="account-widget-head">
            <h2 id="people-heading">People at your shows</h2>
            <p className="account-widget-desc">
              Nearby Fest Friends who marked the same event as “going”.
            </p>
          </div>
          <form className="account-form account-form--location" onSubmit={onSaveLocation}>
            <p className="account-demo-banner">
              Set your area so we can show nearby attendees (exact city/region/country match for now).
            </p>
            <div className="account-form-row">
              <label className="account-label">
                City
                <input
                  name="city"
                  className="account-input"
                  defaultValue={me?.city || ""}
                  placeholder="e.g. Philadelphia"
                />
              </label>
              <label className="account-label">
                Region / State
                <input
                  name="region"
                  className="account-input"
                  defaultValue={me?.region || ""}
                  placeholder="e.g. PA"
                />
              </label>
              <label className="account-label">
                Country
                <input
                  name="country"
                  className="account-input"
                  defaultValue={me?.country || ""}
                  placeholder="e.g. US"
                />
              </label>
            </div>
            <button className="btn btn-secondary" type="submit" disabled={savingMe || !userId}>
              {savingMe ? "Saving…" : "Save area"}
            </button>
            {meError ? (
              <p className="taste-error" role="alert">
                {meError}
              </p>
            ) : null}
          </form>

          {[...goingIds].length === 0 ? (
            <p className="account-muted">Mark an event as “going” to see nearby attendees.</p>
          ) : (
            <ul className="account-people-list">
              {[...goingIds].map((eventId) => {
                const attendees = attendeesByEventId.get(eventId) || [];
                return attendees.map((a) => (
                  <li key={`${eventId}-${a.userId}`} className="account-person-card">
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
                      <span className="account-person-meta">
                        {a.city ? `${a.city}` : ""}
                        {a.region ? `, ${a.region}` : ""}
                        {a.country ? ` · ${a.country}` : ""}
                      </span>
                      {a.age != null || a.race || a.personalityType ? (
                        <span className="account-person-traits">
                          {[
                            a.age != null ? `${a.age} yrs` : null,
                            formatRace(a.race),
                            formatPersonality(a.personalityType),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ));
              })}
            </ul>
          )}
        </section>
      </div>

      <MessageModal
        open={Boolean(dmRecipient)}
        onClose={() => setDmRecipient(null)}
        recipient={dmRecipient}
        fromUserId={userId}
      />
    </main>
  );
}
