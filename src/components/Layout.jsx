import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSpotifySession } from "../hooks/useSpotifySession";
import { fetchUnreadMessageCount } from "../lib/localEventsApi";

export default function Layout() {
  const year = new Date().getFullYear();
  const location = useLocation();
  const { user, taste, loggedIn, logout } = useSpotifySession();
  const userId = taste?.spotifyUserId || user?.id || null;
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!loggedIn || !userId) {
      setUnreadCount(0);
      return;
    }
    fetchUnreadMessageCount(userId)
      .then((r) => setUnreadCount(r.unreadCount ?? 0))
      .catch(() => {});
  }, [loggedIn, userId]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, location.pathname]);

  useEffect(() => {
    const onRead = () => refreshUnread();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };
    window.addEventListener("ff-messages-read", onRead);
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(refreshUnread, 60000);
    return () => {
      window.removeEventListener("ff-messages-read", onRead);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [refreshUnread]);

  return (
    <>
      <div className="bg-orbits" aria-hidden="true">
        <span className="o1" />
        <span className="o2" />
        <span className="o3" />
      </div>

      <header className="site-header wrap">
        <Link to="/" className="logo">
          <span className="logo-mark" aria-hidden="true">
            ♪
          </span>
          Fest Friends
        </Link>
        <nav className="nav" aria-label="Main">
          {loggedIn ? (
            <>
              <Link
                to="/messages"
                className="nav-messages-link"
                aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
              >
                <span className="nav-messages-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </span>
                {unreadCount > 0 ? <span className="nav-messages-badge" aria-hidden="true" /> : null}
              </Link>
              <Link to="/account" className="btn-nav profile-pill">
                {user?.images?.[0]?.url ? (
                  <img
                    src={user.images[0].url}
                    alt=""
                    width={28}
                    height={28}
                    className="nav-avatar"
                  />
                ) : null}
                <span>{user?.display_name || "Your profile"}</span>
              </Link>
              <button type="button" className="btn-text" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <Link className="btn-nav" to="/profile">
              Log in with Spotify
            </Link>
          )}
        </nav>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="wrap">
          <Link to="/" className="logo">
            <span className="logo-mark" aria-hidden="true">
              ♪
            </span>
            Fest Friends
          </Link>
          <div className="footer-meta">
            <span className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Contact</a>
            </span>
            <span>
              {" "}
              · © {year} Fest Friends
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
