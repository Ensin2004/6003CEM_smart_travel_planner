import { Link } from 'react-router-dom';
import heroImage from '../../assets/landing-hero.png';

const navItems = [
  ['Features', '#features'],
  ['How it works', '#how-it-works'],
  ['Safety', '#safety'],
  ['For travellers', '#travellers'],
  ['Demo', '#demo'],
];

const highlights = [
  ['Live destination insight', 'See current weather and useful travel context beside each trip.'],
  ['Everything in one place', 'Keep notes, budgets, checklists, and preferences together.'],
  ['Built for real planning', 'Move from idea to itinerary without scattering details across apps.'],
];

const features = [
  ['Trip planner', 'Save destinations, dates, notes, travel style, and trip status in a clear workspace.'],
  ['Weather preview', 'Check destination conditions before you decide what to pack or schedule.'],
  ['Attractions', 'Discover nearby places and keep interesting stops close to your itinerary.'],
  ['Budget view', 'Track estimated spending so flights, hotels, food, and activities stay visible.'],
  ['Travel checklist', 'Prepare documents, packing items, bookings, and culture reminders before departure.'],
  ['Favourites', 'Save destinations and ideas you want to return to later.'],
];

const workflow = [
  ['Choose a destination', 'Start with the place you want to visit and the dates you have in mind.'],
  ['Add your plans', 'Attach notes, checklist items, budget details, and the kind of trip you prefer.'],
  ['Review the full picture', 'See your saved plan together with weather, attractions, and useful reminders.'],
];

const securityItems = [
  ['Private travel space', 'Your trips and preferences are kept in your own account area.'],
  ['Clear access control', 'Regular users and administrators see different tools based on their role.'],
  ['Responsible handling', 'The app is designed to avoid exposing sensitive information on public pages.'],
];

const travellerTypes = [
  ['Weekend planners', 'Quickly compare weather, notes, and must-see stops for short breaks.'],
  ['Budget travellers', 'Keep planned costs visible while building the trip.'],
  ['Culture seekers', 'Add customs, food ideas, etiquette notes, and meaningful local experiences.'],
  ['Group organizers', 'Prepare cleaner trip records for sharing during discussion and demos.'],
];

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero" id="home" style={{ backgroundImage: `url(${heroImage})` }}>
        <nav className="landing-nav" aria-label="Main navigation">
          <Link className="brand-mark" to="/">
            <span>ST</span>
            Smart Travel Planner
          </Link>
          <div className="nav-links">
            {navItems.map(([label, href]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <Link to="/login">Login</Link>
            <Link className="nav-button" to="/register">
              Sign up
            </Link>
          </div>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">Smart travel workspace</p>
          <h1>Plan trips with clarity before you even pack.</h1>
          <p className="hero-copy">
            Bring destinations, notes, weather, attractions, budgets, and travel
            checklists into one calm workspace designed for better decisions.
          </p>
          <dl className="hero-metrics" aria-label="Travel planning highlights">
            <div>
              <dt>Plan</dt>
              <dd>Trips</dd>
            </div>
            <div>
              <dt>Check</dt>
              <dd>Weather</dd>
            </div>
            <div>
              <dt>Track</dt>
              <dd>Budget</dd>
            </div>
          </dl>
          <div className="hero-actions">
            <Link className="primary-action" to="/register">
              Start planning
            </Link>
            <Link className="secondary-action" to="/login">
              View demo
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-strip" aria-label="Platform highlights">
        {highlights.map(([title, copy]) => (
          <article className="highlight-card" key={title}>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="landing-section feature-section" id="features">
        <div className="section-heading">
          <p className="eyebrow">Features</p>
          <h2>A complete trip hub for the details travellers actually use.</h2>
          <p>
            Smart Travel Planner keeps the practical pieces of a trip connected, so
            your ideas, preparation, and destination context stay easy to scan.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(([title, copy]) => (
            <article className="feature-tile" key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section workflow-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From destination idea to organized travel plan.</h2>
        </div>
        <div className="timeline">
          {workflow.map(([title, copy], index) => (
            <article className="timeline-step" key={title}>
              <span>{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section split-section" id="safety">
        <div>
          <p className="eyebrow">Safety</p>
          <h2>Designed so personal travel details stay personal.</h2>
          <p>
            Travel plans can include dates, preferences, notes, and spending estimates.
            The app keeps that experience account-based and avoids showing private
            planning details on the public website.
          </p>
        </div>
        <div className="security-list">
          {securityItems.map(([title, copy]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section stack-section" id="travellers">
        <div className="section-heading">
          <p className="eyebrow">For travellers</p>
          <h2>Flexible enough for quick escapes and detailed itineraries.</h2>
        </div>
        <div className="stack-row">
          {travellerTypes.map(([title, copy]) => (
            <article className="traveller-pill" key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta" id="demo">
        <div>
          <p className="eyebrow">Try the preview</p>
          <h2>Step inside the planner and explore the workspace.</h2>
          <p>
            The current preview lets you enter the dashboard instantly while sign-in
            is being connected behind the scenes.
          </p>
        </div>
        <div className="cta-actions">
          <Link className="primary-action" to="/login">
            Login demo
          </Link>
          <Link className="secondary-action" to="/register">
            Sign up demo
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <Link className="brand-mark footer-brand" to="/">
            <span>ST</span>
            Smart Travel Planner
          </Link>
          <p>6003CEM Web API Development group project.</p>
        </div>
        <nav aria-label="Footer navigation">
          {navItems.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}

export default LandingPage;
