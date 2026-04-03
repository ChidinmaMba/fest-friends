import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  clearSpotifySession,
  getStoredUser,
  getTasteProfile,
  hasSpotifySession,
} from "../lib/spotifySession";

export function useSpotifySession() {
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [taste, setTaste] = useState(() => getTasteProfile());

  const refresh = useCallback(() => {
    setUser(getStoredUser());
    setTaste(getTasteProfile());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  const logout = useCallback(() => {
    clearSpotifySession();
    setUser(null);
    setTaste(null);
  }, []);

  return {
    user,
    taste,
    loggedIn: hasSpotifySession(),
    logout,
    refresh,
  };
}
