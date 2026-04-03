import { Link, Outlet } from "react-router-dom";
import { useSpotifySession } from "../hooks/useSpotifySession";

export default function Layout() {
  const year = new Date().getFullYear();
  const { user, loggedIn, logout } = useSpotifySession();

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
