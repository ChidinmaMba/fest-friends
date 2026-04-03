# fest-friends

## Commands

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev -- --host 127.0.0.1
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Spotify login

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Under **Redirect URIs**, add your callback URL exactly (for local dev: `http://localhost:5173/callback`).
3. Copy the **Client ID** and create a `.env` file in the project root:

```bash
cp .env.example .env
```

Set `VITE_SPOTIFY_CLIENT_ID` to your Client ID. Optionally set `VITE_SPOTIFY_REDIRECT_URI` if your app is not served at the origin you use in the browser (defaults to `${origin}/callback`).

Restart the dev server after changing env vars.

The app uses **Authorization Code with PKCE** (no client secret in the browser). After login it reads your Spotify **top artists** and **top tracks** (medium term) and builds a taste profile (genres, favorites, summary) stored in `sessionStorage` for the session, then sends you to **`/account`**.

## Account page

After a successful Spotify sign-in you land on **`/account`**, which shows:

- **Upcoming shows** — community-submitted concerts and festivals (stored locally in SQLite via a tiny API server).
- **People at your shows** — nearby Fest Friends who marked the same events as “going” (exact city/region/country match for now).

### Local API (events + RSVPs)

Run the API server (SQLite) in one terminal:

```bash
npm run dev:api
```

Run the Vite app in another:

```bash
npm run dev -- --host 127.0.0.1
```

Or run both together:

```bash
npm run dev:full
```

Data is stored in `data/fest-friends.sqlite` (ignored by git).