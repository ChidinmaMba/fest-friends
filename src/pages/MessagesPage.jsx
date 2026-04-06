import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSpotifySession } from "../hooks/useSpotifySession";
import { fetchMessages, markMessagesRead } from "../lib/localEventsApi";

function formatMsgTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { user, taste, loggedIn } = useSpotifySession();
  const userId = taste?.spotifyUserId || user?.id || null;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loggedIn || !userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const r = await fetchMessages(userId);
        if (!cancelled) setMessages(r.messages || []);
        await markMessagesRead(userId);
        window.dispatchEvent(new Event("ff-messages-read"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load messages.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, userId]);

  if (!loggedIn) {
    return (
      <main className="wrap messages-page">
        <p className="account-muted">Log in to see your messages.</p>
        <Link className="btn btn-primary" to="/profile">
          Log in with Spotify
        </Link>
      </main>
    );
  }

  return (
    <main className="wrap messages-page">
      <header className="messages-page-head">
        <h1 className="messages-page-title">Messages</h1>
        <p className="messages-page-desc">
          Direct messages you’ve sent and received. Opening this page marks new inbound messages as read.
        </p>
      </header>

      {loading ? (
        <p className="account-muted">Loading…</p>
      ) : error ? (
        <p className="taste-error" role="alert">
          {error}
        </p>
      ) : messages.length === 0 ? (
        <p className="account-muted">No messages yet. Send one from someone’s profile on the account page.</p>
      ) : (
        <ul className="messages-thread-list">
          {messages.map((m) => (
            <li key={m.messageId}>
              <article
                className={`messages-bubble ${m.direction === "out" ? "messages-bubble--out" : "messages-bubble--in"}`}
              >
                <div className="messages-bubble-meta">
                  {m.direction === "out" ? (
                    <span>
                      To <strong>{m.otherDisplayName || "Fest Friend"}</strong>
                    </span>
                  ) : (
                    <span>
                      From <strong>{m.otherDisplayName || "Fest Friend"}</strong>
                    </span>
                  )}
                  <span className="messages-bubble-time">{formatMsgTime(m.createdAt)}</span>
                </div>
                <p className="messages-bubble-body">{m.body}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
