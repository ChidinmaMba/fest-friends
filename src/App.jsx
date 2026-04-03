import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AccountPage from "./pages/AccountPage";
import EventPage from "./pages/EventPage";
import HomePage from "./pages/HomePage";
import SpotifyCallback from "./pages/SpotifyCallback";
import TasteProfilePage from "./pages/TasteProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="events/:eventId" element={<EventPage />} />
          <Route path="profile" element={<TasteProfilePage />} />
          <Route path="callback" element={<SpotifyCallback />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
