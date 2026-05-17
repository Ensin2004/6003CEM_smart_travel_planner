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
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicTopbar from '../../components/PublicTopbar';
import publicNavItems from '../../components/publicNavItems';
import heroImage from '../../assets/landing-hero.png';
import logo from '../../assets/logo.png';
import './LandingPage.css';

const highlights = [
  [CloudSun, 'Live destination insight', 'See weather and travel context beside each saved trip.'],
  [ListChecks, 'Everything in one place', 'Keep notes, budgets, checklists, and preferences together.'],
  [Sparkles, 'Built for real planning', 'Move from idea to itinerary without scattering details across apps.'],
];

const features = [
  [CalendarDays, 'Trip planner', 'Save destinations, dates, notes, travel style, and trip status in a clear workspace.'],
  [CloudSun, 'Weather preview', 'Check destination conditions before you decide what to pack or schedule.'],
  [MapPinned, 'Attractions', 'Discover nearby places and keep interesting stops close to your itinerary.'],
  [WalletCards, 'Budget view', 'Track estimated spending so flights, hotels, food, and activities stay visible.'],
  [ListChecks, 'Travel checklist', 'Prepare documents, packing items, bookings, and culture reminders before departure.'],
  [Heart, 'Favourites', 'Save destinations and ideas you want to return to later.'],
];

const workflow = [
  [MapPinned, 'Choose a destination', 'Start with the place you want to visit and the dates you have in mind.'],
  [ListChecks, 'Add your plans', 'Attach notes, checklist items, budget details, and the kind of trip you prefer.'],
  [CheckCircle2, 'Review the full picture', 'See your saved plan together with weather, attractions, and useful reminders.'],
];

const securityItems = [
  [Lock, 'Private travel space', 'Your trips and preferences are kept in your own account area.'],
  [ShieldCheck, 'Clear access control', 'Regular users and administrators see different tools based on their role.'],
  [CheckCircle2, 'Responsible handling', 'The app is designed to avoid exposing sensitive information on public pages.'],
];

const travellerTypes = [
  [CalendarDays, 'Weekend planners', 'Quickly compare weather, notes, and must-see stops for short breaks.'],
  [WalletCards, 'Budget travellers', 'Keep planned costs visible while building the trip.'],
  [Compass, 'Culture seekers', 'Add customs, food ideas, etiquette notes, and meaningful local experiences.'],
  [Users, 'Group organizers', 'Prepare cleaner trip records for sharing during discussion and demos.'],
];

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
            <p className="eyebrow">Smart travel workspace</p>
            <h1>Plan every trip with calm, clear decisions.</h1>
            <p className="hero-copy">
              Organize destinations, budgets, weather, attractions, notes, and
              checklists in one workspace before you book, pack, or depart.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" to="/register">
                Start planning
              </Link>
              <Link className="secondary-action" to="/login">
                Explore demo
              </Link>
            </div>
            <dl className="hero-metrics" aria-label="Travel planning highlights">
              <div>
                <dt>Trips</dt>
                <dd>Organized</dd>
              </div>
              <div>
                <dt>Weather</dt>
                <dd>Previewed</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>Visible</dd>
              </div>
            </dl>
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
                <strong>18 C clear</strong>
              </article>
              <article>
                <CreditCard size={18} />
                <span>Budget</span>
                <strong>$1,240</strong>
              </article>
              <article>
                <Compass size={18} />
                <span>Stops</span>
                <strong>8 saved</strong>
              </article>
              <article>
                <ListChecks size={18} />
                <span>Checklist</span>
                <strong>12 tasks</strong>
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
              <span>Weather context</span>
              <span>Budget notes</span>
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
              <span><CloudSun size={16} /> Weather ready</span>
              <span><WalletCards size={16} /> Budget visible</span>
              <span><ListChecks size={16} /> Checklist synced</span>
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
              A simple flow helps travellers move from rough ideas to useful plans
              without jumping between notes, weather pages, and budget lists.
            </p>
            <div className="section-points section-points-left" aria-label="Planning flow">
              <span>Choose</span>
              <span>Prepare</span>
              <span>Review</span>
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
            Travel plans can include dates, preferences, notes, and spending estimates.
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
              <Users size={18} aria-hidden="true" />
              For travellers
            </p>
            <h2>Flexible enough for quick escapes and detailed itineraries.</h2>
            <p>
              Whether the trip is short, careful, cultural, or group-based, the
              workspace keeps the planning details easy to understand.
            </p>
            <div className="section-points section-points-left section-points-dark" aria-label="Traveller types">
              <span>Solo</span>
              <span>Group</span>
              <span>Budget</span>
              <span>Culture</span>
            </div>
          </div>
          <div className="traveller-visual" aria-hidden="true">
            <span>Planning styles</span>
            <strong>4 traveller modes</strong>
            <div>
              <small>Weekend</small>
              <small>Budget</small>
              <small>Culture</small>
              <small>Group</small>
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

      <section className="landing-cta reveal-on-scroll" id="demo">
        <div>
          <p className="section-kicker">
            <Compass size={18} aria-hidden="true" />
            Try the preview
          </p>
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

export default LandingPage;
