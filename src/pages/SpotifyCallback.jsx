import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { debugAgentLog } from "../lib/debugAgentLog";
import { exchangeCodeForTokens } from "../lib/spotifyAuth";
import { getRedirectUri } from "../lib/spotifyConfig";
import { getAccessToken, saveUser, saveTasteProfile } from "../lib/spotifySession";
import { fetchCurrentUser, fetchTopArtists, fetchTopTracks } from "../lib/spotifyWebApi";
import { buildTasteProfile } from "../lib/tasteProfile";

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState({ kind: "loading", message: "Finishing Spotify sign-in…" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const code = params.get("code");
    // #region agent log
    debugAgentLog(
      "SpotifyCallback.jsx:params",
      "OAuth redirect query",
      {
        origin: window.location.origin,
        pathname: window.location.pathname,
        hasCode: Boolean(code),
        spotifyError: err,
      },
      "H5"
    );
    // #endregion

    if (err) {
      const desc = params.get("error_description");
      setState({
        kind: "error",
        message: desc || err,
      });
      return;
    }

    if (!code) {
      setState({
        kind: "error",
        message: "Missing authorization code. Start sign-in from the profile page.",
      });
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        await exchangeCodeForTokens(code);
        const token = getAccessToken();
        if (!token) throw new Error("No access token after login.");

        const [me, topArtists, topTracks] = await Promise.all([
          fetchCurrentUser(token),
          fetchTopArtists(token),
          fetchTopTracks(token),
        ]);

        const profile = buildTasteProfile(me, topArtists, topTracks);
        saveUser(me);
        saveTasteProfile(profile);

        // Defer so sessionStorage writes are settled before AccountPage reads session.
        queueMicrotask(() => {
          if (!cancelled) {
            console.log("Navigating to /account");
            navigate("/account", { replace: true });
          }
        });
      } catch (e) {
        // #region agent log
        debugAgentLog(
          "SpotifyCallback.jsx:run:catch",
          "Callback flow error",
          {
            errName: e instanceof Error ? e.name : typeof e,
            errMessage: e instanceof Error ? e.message.slice(0, 400) : String(e),
          },
          "H1-H3"
        );
        // #endregion
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              e instanceof Error ? e.message : "Something went wrong. Try again.",
          });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="wrap callback-main">
      {state.kind === "loading" ? (
        <p className="callback-status">{state.message}</p>
      ) : (
        <>
          <p className="callback-status callback-error">{state.message}</p>
          <p className="callback-hint">
            Register this redirect URI in the Spotify dashboard:{" "}
            <code>{getRedirectUri()}</code>
          </p>
          <Link className="btn btn-secondary" to="/profile">
            Back to sign-in
          </Link>
        </>
      )}
    </main>
  );
}
