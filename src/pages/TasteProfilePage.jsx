import { useState } from "react";
import { Link } from "react-router-dom";
import { startSpotifyLogin } from "../lib/spotifyAuth";
import { getSpotifyClientId } from "../lib/spotifyConfig";
import { refreshTasteProfileFromSpotify } from "../lib/refreshTasteProfile";
import { useSpotifySession } from "../hooks/useSpotifySession";

export default function TasteProfilePage() {
  const { user, taste, loggedIn, refresh } = useSpotifySession();
  const [loginError, setLoginError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const missingClient = !getSpotifyClientId();

  async function handleSpotifyConnect() {
    setLoginError(null);
    const result = await startSpotifyLogin();
    if (result && !result.ok) setLoginError(result.error);
  }

  if (!loggedIn) {
    return (
      <main className="wrap taste-gate">
        <h1 className="taste-gate-title">Sign in with Spotify</h1>
        <p className="taste-gate-lead">
          We use your Spotify top artists and tracks (last ~6 months) to build a
          taste profile—genres you gravitate toward and music you actually loop.
          That becomes the starting point for matching you with concert and
          festival friends.
        </p>
        {missingClient ? (
          <p className="taste-error">
            Add <code>VITE_SPOTIFY_CLIENT_ID</code> to your <code>.env</code>{" "}
            file and restart the dev server. Create an app in the{" "}
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Spotify Developer Dashboard
            </a>{" "}
            and set the redirect URI to{" "}
            <code>{`${window.location.origin}/callback`}</code>.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-spotify"
              onClick={handleSpotifyConnect}
            >
              <svg
                className="btn-spotify-icon"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              Continue with Spotify
            </button>
            {loginError ? <p className="taste-error">{loginError}</p> : null}
          </>
        )}
        <p className="taste-gate-note">
          <Link to="/">← Back to home</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="wrap taste-profile-page">
      <p className="taste-breadcrumb">
        <Link to="/account">← Account</Link>
      </p>
      <div className="taste-profile-header">
        {user?.images?.[0]?.url ? (
          <img
            className="taste-hero-avatar"
            src={user.images[0].url}
            alt=""
            width={96}
            height={96}
          />
        ) : null}
        <div>
          <h1 className="taste-profile-name">
            {user?.display_name || "Your taste profile"}
          </h1>
          <p className="taste-profile-sub">
            Built from your Spotify top artists & tracks (medium term — roughly the last several months).
          </p>
        </div>
        <div className="taste-profile-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={refreshing}
            onClick={async () => {
              setRefreshError(null);
              setRefreshing(true);
              try {
                await refreshTasteProfileFromSpotify();
                refresh();
              } catch (e) {
                setRefreshError(
                  e instanceof Error ? e.message : "Could not refresh profile."
                );
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {refreshing ? "Refreshing…" : "Refresh from Spotify"}
          </button>
        </div>
      </div>

      {refreshError ? <p className="taste-error">{refreshError}</p> : null}

      {taste?.summary ? (
        <p className="taste-summary">{taste.summary}</p>
      ) : null}

      {taste?.primaryGenres?.length ? (
        <section className="taste-section" aria-labelledby="genres-heading">
          <h2 id="genres-heading">Genre lean</h2>
          <ul className="taste-chips">
            {taste.primaryGenres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {taste?.topArtists?.length ? (
        <section className="taste-section" aria-labelledby="artists-heading">
          <h2 id="artists-heading">Top artists</h2>
          <ul className="taste-grid">
            {taste.topArtists.map((a) => (
              <li key={a.id} className="taste-card">
                {a.image ? (
                  <img src={a.image} alt="" width={120} height={120} loading="lazy" />
                ) : (
                  <div className="taste-card-placeholder" aria-hidden="true">
                    ♪
                  </div>
                )}
                <div className="taste-card-body">
                  <strong>{a.name}</strong>
                  {a.genres?.length ? (
                    <span className="taste-card-meta">{a.genres.slice(0, 2).join(" · ")}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {taste?.topTracks?.length ? (
        <section className="taste-section" aria-labelledby="tracks-heading">
          <h2 id="tracks-heading">Top tracks</h2>
          <ol className="taste-tracks">
            {taste.topTracks.map((t) => (
              <li key={t.id}>
                <div className="taste-track-main">
                  {t.image ? (
                    <img src={t.image} alt="" width={48} height={48} loading="lazy" />
                  ) : null}
                  <div>
                    <strong>{t.name}</strong>
                    <span className="taste-track-meta">
                      {(t.artists || []).join(", ")}
                      {t.album ? ` — ${t.album}` : ""}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="taste-footnote">
        This profile is stored in your browser for this session. A future
        backend can save it to your Fest Friends account for matching.
      </p>
    </main>
  );
}
