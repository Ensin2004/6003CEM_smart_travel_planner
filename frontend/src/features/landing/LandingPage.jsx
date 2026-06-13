/**
 * Landing module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Compass,
  CreditCard,
  Heart,
  ListChecks,
  Lock,
  MapPinned,
  Plane,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicTopbar from '../../components/PublicTopbar';
import CurrencyAmount from '../../components/currency/CurrencyAmount';
import publicNavItems from '../../components/publicNavItems';
import heroImage from '../../assets/landing-hero.png';
import logo from '../../assets/logo.png';
import './LandingPage.css';

const highlights = [
  [CloudSun, 'Plan Destinations', 'See weather guidance and place suggestions while building each trip.'],
  [ListChecks, 'Practical travel tools', 'Prepare packing lists and travel document checklists in your account.'],
  [Sparkles, 'AI-assistance', 'Ask AI for trip ideas, local insights and help comparing search results.'],
];

const features = [
  [Plane, 'Multi-destination trips', 'Create trips with dates, multiple destinations and a total budget.'],
  [CalendarDays, 'Day-by-day itinerary', 'Plan activities, food, stays and transportation for each day of a trip.'],
  [Compass, 'Explore', 'Search attractions, restaurants, hotels and transport with filters and AI insights.'],
  [MapPinned, 'Map and routes', 'Find places on an interactive map and compare available travel modes and route details.'],
  [Heart, 'Saved and visited places', 'Keep favourites, mark places as visited and compare options across the planner.'],
  [ListChecks, 'Travel preparation', 'Use weather guidance, packing lists, travel documents, destination guides and language help.'],
];

const workflow = [
  [MapPinned, 'Create a trip', 'Choose one or more destinations, set exact or flexible dates, and enter your budget.'],
  [ListChecks, 'Build the itinerary', 'Add places and plans to each day, then review route, weather, and budget details.'],
  [CheckCircle2, 'Prepare to travel', 'Save favourites, track visited places, and complete packing and document lists.'],
];

const securityItems = [
  [Lock, 'Private travel space', 'Your trips, itineraries, lists, and saved places stay in your account area.'],
  [ShieldCheck, 'Clear access control', 'Regular users and administrators see different tools based on their role.'],
  [CheckCircle2, 'Responsible handling', 'The app is designed to avoid exposing sensitive information on public pages.'],
];

const travellerTypes = [
  [CalendarDays, 'Flexible dates', 'Plan with exact dates or choose a month and trip length when dates are not fixed.'],
  [WalletCards, 'Track Budget', 'Set a trip budget and track planned daily and itinerary item costs.'],
  [Compass, 'Explore Places', 'Research places, stays, food, transport, travel guides and local language resources.'],
  [CheckCircle2, 'Prepared travellers', 'Keep packing and travel document records ready in one account.'],
];
// LandingPage renders the main screen and handles nearby interactions.
function LandingPage() {
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealElements.forEach((element) => observer.observe(element));
    // Cleanup prevents state updates after component unmount.
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const section = document.getElementById(window.location.hash.slice(1));
    if (!section) {
      return;
    }

    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);
  return (
    <main className="landing-page">
      <PublicTopbar />
      <section className="landing-hero" id="home" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-layout">
          <div className="hero-content">
            <h1>Smart Travel Planner</h1>
            <p className="hero-copy">
              Plan every trip with calm, clear decisions by organizing destinations,
              budgets, weather, attractions, transport and checklists in one workspace.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" to="/login">
                Login
              </Link>
              <Link className="secondary-action" to="/register">
                Sign Up
              </Link>
            </div>
          </div>

          <div className="hero-preview" aria-label="Planner preview">
            <div className="preview-header">
              <div>
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
              </div>
              <strong>Trip overview</strong>
            </div>
            <div className="preview-destination">
              <div>
                <p>Upcoming plan</p>
                <h2>Tokyo spring escape</h2>
              </div>
              <span>Ready</span>
            </div>
            <div className="preview-grid">
              <article>
                <CloudSun size={18} />
                <span>Weather</span>
                <strong>18 °C clear</strong>
              </article>
              <article>
                <CreditCard size={18} />
                <span>Budget</span>
                <strong><CurrencyAmount amount={1240} /></strong>
              </article>
              <article>
                <Compass size={18} />
                <span>Destinations</span>
                <strong>8 saved</strong>
              </article>
              <article>
                <ListChecks size={18} />
                <span>Itinerary</span>
                <strong>12 plans</strong>
              </article>
            </div>
            <div className="preview-progress">
              <div>
                <span>Planning progress</span>
                <strong>72%</strong>
              </div>
              <span className="progress-track">
                <span />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-strip reveal-on-scroll" aria-label="Platform highlights">
        {highlights.map(([Icon, title, copy]) => (
          <article className="highlight-card" key={title}>
            <Icon size={22} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="landing-section feature-section reveal-on-scroll" id="features">
        <div className="section-showcase section-showcase-feature">
          <div className="section-heading section-heading-left">
            <p className="section-kicker">
              <Sparkles size={18} aria-hidden="true" />
              Features
            </p>
            <h2>A complete trip hub for the details travellers actually use.</h2>
            <p>
              Smart Travel Planner keeps the practical pieces of a trip connected, so
              your ideas, preparation, and destination context stay easy to scan.
            </p>
            <div className="section-points section-points-left" aria-label="Feature highlights">
              <span>Trip records</span>
              <span>Daily itinerary</span>
              <span>Travel tools</span>
            </div>
          </div>
          <div className="section-visual feature-visual" aria-hidden="true">
            <div className="visual-toolbar">
              <span />
              <span />
              <span />
            </div>
            <div className="visual-trip-card">
              <MapPinned size={22} />
              <div>
                <strong>Kyoto itinerary</strong>
                <small>4 days · culture · food</small>
              </div>
            </div>
            <div className="visual-list">
              <span><CloudSun size={16} /> Weather: Sunny</span>
              <span><WalletCards size={16} /> Budget: $1,240.00</span>
              <span><ListChecks size={16} /> Itinerary: 4 destinations</span>
            </div>
          </div>
        </div>
        <div className="feature-grid">
          {features.map(([Icon, title, copy]) => (
            <article className="feature-tile" key={title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section workflow-section reveal-on-scroll" id="how-it-works">
        <div className="section-showcase section-showcase-workflow">
          <div className="workflow-map" aria-hidden="true">
            <span className="map-pin map-pin-one"><MapPinned size={18} /></span>
            <span className="map-route" />
            <span className="map-pin map-pin-two"><ListChecks size={18} /></span>
            <span className="map-route map-route-second" />
            <span className="map-pin map-pin-three"><CheckCircle2 size={18} /></span>
          </div>
          <div className="section-heading section-heading-left">
            <p className="section-kicker">
              <ListChecks size={18} aria-hidden="true" />
              How it works
            </p>
            <h2>From destination idea to organized travel plan.</h2>
            <p>
              Start with a trip record, turn it into a day-by-day itinerary, then use
              the built-in discovery and preparation tools before departure.
            </p>
            <div className="section-points section-points-left" aria-label="Planning flow">
              <span>Choose</span>
              <span>Plan</span>
              <span>Prepare</span>
            </div>
          </div>
        </div>
        <div className="timeline">
          {workflow.map(([Icon, title, copy], index) => (
            <article className="timeline-step" key={title}>
              <span>{index + 1}</span>
              <div>
                <Icon size={24} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section split-section reveal-on-scroll" id="safety">
        <div className="section-heading section-heading-left">
          <p className="section-kicker">
            <ShieldCheck size={18} aria-hidden="true" />
            Safety
          </p>
          <h2>Designed so personal travel details stay personal.</h2>
          <p>
            Travel plans can include dates, destinations, itineraries and spending estimates.
            The app keeps that experience account-based and avoids showing private
            planning details on the public website.
          </p>
          <div className="section-points section-points-left" aria-label="Safety highlights">
            <span>Account based</span>
            <span>Role aware</span>
            <span>Private by default</span>
          </div>
        </div>
        <div className="security-list">
          <div className="security-summary" aria-hidden="true">
            <ShieldCheck size={28} />
            <div>
              <strong>Protected planning area</strong>
              <span>Account controls · role access · private records</span>
            </div>
          </div>
          {securityItems.map(([Icon, title, copy]) => (
            <article key={title}>
              <Icon size={22} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section stack-section reveal-on-scroll" id="travellers">
        <div className="section-showcase section-showcase-travellers">
          <div className="section-heading section-heading-left">
            <p className="section-kicker section-kicker-dark">
              <Compass size={18} aria-hidden="true" />
              For travellers
            </p>
            <h2>Useful across different ways of planning a trip.</h2>
            <p>
              The same workspace supports flexible dates, budget tracking, destination
              research, detailed itineraries and pre-travel preparation.
            </p>
            <div className="section-points section-points-left section-points-dark" aria-label="Traveller types">
              <span>Flexible</span>
              <span>Detailed</span>
              <span>Budget</span>
              <span>Prepared</span>
            </div>
          </div>
          <div className="traveller-visual" aria-hidden="true">
            <span>Planning support</span>
            <strong>One connected workspace</strong>
            <div>
              <small>Flexible dates</small>
              <small>Budget</small>
              <small>Explore</small>
              <small>Preparation</small>
            </div>
          </div>
        </div>
        <div className="stack-row">
          {travellerTypes.map(([Icon, title, copy]) => (
            <article className="traveller-pill" key={title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <Link className="brand-mark footer-brand" to="/">
            <img className="brand-logo" src={logo} alt="" aria-hidden="true" />
            Smart Travel Planner
          </Link>
          <p>6003CEM Web API Development group project.</p>
        </div>
        <nav aria-label="Footer navigation">
          {publicNavItems.map(([, label, sectionId]) => (
            <a href={`#${sectionId}`} key={sectionId}>
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}
// Default export registers the primary  value.
export default LandingPage;
