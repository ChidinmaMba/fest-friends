import { Link } from "react-router-dom";
import { useSpotifySession } from "../hooks/useSpotifySession";

export default function HomePage() {
  const { loggedIn } = useSpotifySession();

  return (
    <main>
      <section className="hero wrap" aria-labelledby="hero-heading">
        <p className="hero-badge">
          <strong>New</strong> — Built for live music people
        </p>
        <h1 id="hero-heading">
          Friends for the
          <br />
          <span className="line2">next show</span>
        </h1>
        <p className="hero-lead">
          Connect with people in your city who share your taste—so you never
          have to hit a festival solo or skip a gig because no one else wanted
          tickets. Link Spotify once and we&apos;ll map your listening to a taste
          profile you can use to find compatible show buddies.
        </p>
        <div className="hero-cta">
          <Link
            className="btn btn-primary"
            to={loggedIn ? "/account" : "/profile"}
          >
            {loggedIn ? "Go to your account" : "Connect with Spotify"}
          </Link>
          <a className="btn btn-secondary" href="#how">
            See how it works
          </a>
        </div>
        <div className="hero-stats" role="presentation">
          <div>
            <strong>City-first</strong>
            <span>Match locally</span>
          </div>
          <div>
            <strong>Spotify taste</strong>
            <span>Top artists & tracks</span>
          </div>
          <div>
            <strong>Live music</strong>
            <span>Gigs & festivals</span>
          </div>
        </div>
      </section>

      <section id="why" className="wrap" aria-labelledby="why-heading">
        <div className="section-head">
          <h2 id="why-heading">Made for people who actually go to shows</h2>
          <p>
            Whether you’re into arena pop, basement punk, or three-day camping
            festivals—find others who get it and want to be there with you.
          </p>
        </div>
        <div className="cards">
          <article className="card">
            <div className="card-icon" aria-hidden="true">
              📍
            </div>
            <h3>Your city, your scene</h3>
            <p>
              Meet people nearby so planning a ride, a pre-show bite, or a
              weekend trip actually works in real life—not just online.
            </p>
          </article>
          <article className="card">
            <div className="card-icon" aria-hidden="true">
              🎧
            </div>
            <h3>Your Spotify, your profile</h3>
            <p>
              We derive genres and favorites from what you already listen to—so
              your profile reflects real taste, not a quiz you took once.
            </p>
          </article>
          <article className="card">
            <div className="card-icon" aria-hidden="true">
              🎪
            </div>
            <h3>From club nights to festival weekends</h3>
            <p>
              Find a plus-one for a Tuesday show or a whole crew for summer
              fest season—whatever fits how you like to experience live music.
            </p>
          </article>
        </div>
      </section>

      <section id="how" className="wrap" aria-labelledby="how-heading">
        <div className="section-head">
          <h2 id="how-heading">How it works</h2>
          <p>Three steps from “new in town” to “see you at the barrier.”</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num" aria-hidden="true">
              1
            </div>
            <h3>Connect Spotify</h3>
            <p>
              We read your top artists and tracks (medium term) to build a
              taste profile—genres you lean on and records you actually replay.
            </p>
          </div>
          <div className="step">
            <div className="step-num" aria-hidden="true">
              2
            </div>
            <h3>Discover compatible people</h3>
            <p>
              We suggest locals with overlapping interests so you can start a
              conversation that feels natural, not random.
            </p>
          </div>
          <div className="step">
            <div className="step-num" aria-hidden="true">
              3
            </div>
            <h3>Plan something real</h3>
            <p>
              Pick a gig, split tickets, meet up before doors—turn shared taste
              into shared memories.
            </p>
          </div>
        </div>

        <div id="join" className="cta-band">
          <h2>Ready to fill your calendar?</h2>
          <p>
            Connect Spotify to generate your taste profile and join Fest Friends
            in your city.
          </p>
          <Link
            className="btn btn-primary"
            to={loggedIn ? "/account" : "/profile"}
          >
            {loggedIn ? "Go to your account" : "Connect with Spotify"}
          </Link>
        </div>
      </section>
    </main>
  );
}
