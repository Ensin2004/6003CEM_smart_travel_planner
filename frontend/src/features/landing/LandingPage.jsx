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

// ============================================================
// CONFIGURATION DATA
// ============================================================

/**
 * Highlights data for the landing strip section.
 * Each entry contains an icon component, title, and descriptive copy.
 * These highlights appear immediately below the hero section.
 */
const highlights = [
  [CloudSun, 'Plan Destinations', 'See weather guidance and place suggestions while building each trip.'],
  [ListChecks, 'Practical travel tools', 'Prepare packing lists and travel document checklists in your account.'],
  [Sparkles, 'AI-assistance', 'Ask AI for trip ideas, local insights and help comparing search results.'],
];

/**
 * Core features data for the feature grid section.
 * Each entry pairs an icon with a feature title and explanatory description.
 * These represent the primary functionality offered by the application.
 */
const features = [
  [Plane, 'Multi-destination trips', 'Create trips with dates, multiple destinations and a total budget.'],
  [CalendarDays, 'Day-by-day itinerary', 'Plan activities, food, stays and transportation for each day of a trip.'],
  [Compass, 'Explore', 'Search attractions, restaurants, hotels and transport with filters and AI insights.'],
  [MapPinned, 'Map and routes', 'Find places on an interactive map and compare available travel modes and route details.'],
  [Heart, 'Saved and visited places', 'Keep favourites, mark places as visited and compare options across the planner.'],
  [ListChecks, 'Travel preparation', 'Use weather guidance, packing lists, travel documents, destination guides and language help.'],
];

/**
 * Workflow steps data for the "How it works" section.
 * Each entry describes a phase in the trip planning journey.
 * The order represents the sequential flow from creation to preparation.
 */
const workflow = [
  [MapPinned, 'Create a trip', 'Choose one or more destinations, set exact or flexible dates, and enter your budget.'],
  [ListChecks, 'Build the itinerary', 'Add places and plans to each day, then review route, weather, and budget details.'],
  [CheckCircle2, 'Prepare to travel', 'Save favourites, track visited places, and complete packing and document lists.'],
];

/**
 * Security features data for the safety section.
 * Each entry describes a privacy or access control measure.
 * These highlight the application's approach to data protection.
 */
const securityItems = [
  [Lock, 'Private travel space', 'Your trips, itineraries, lists, and saved places stay in your account area.'],
  [ShieldCheck, 'Clear access control', 'Regular users and administrators see different tools based on their role.'],
  [CheckCircle2, 'Responsible handling', 'The app is designed to avoid exposing sensitive information on public pages.'],
];

/**
 * Traveller types data for the "For travellers" section.
 * Each entry represents a different planning approach or user need.
 * This demonstrates the versatility of the application.
 */
const travellerTypes = [
  [CalendarDays, 'Flexible dates', 'Plan with exact dates or choose a month and trip length when dates are not fixed.'],
  [WalletCards, 'Track Budget', 'Set a trip budget and track planned daily and itinerary item costs.'],
  [Compass, 'Explore Places', 'Research places, stays, food, transport, travel guides and local language resources.'],
  [CheckCircle2, 'Prepared travellers', 'Keep packing and travel document records ready in one account.'],
];

// ============================================================
// COMPONENT DEFINITION
// ============================================================

/**
 * LandingPage component renders the main marketing and information screen.
 * This serves as the public-facing entry point for the application.
 * The component manages scroll-triggered animations and hash-based navigation.
 */
function LandingPage() {
  // ============================================================
  // EFFECT: SCROLL REVEAL ANIMATIONS
  // ============================================================

  /**
   * Sets up an Intersection Observer to animate elements into view.
   * Elements with the 'reveal-on-scroll' class become visible when scrolled into view.
   * The observer is disconnected during cleanup to prevent memory leaks.
   */
  useEffect(() => {
    // Select all elements that should animate on scroll
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    // Create an observer that triggers when elements enter the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add visibility class and stop observing once revealed
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 } // Trigger when 16% of the element is visible
    );

    // Start observing each element
    revealElements.forEach((element) => observer.observe(element));
    
    // Cleanup to prevent state updates after component unmount
    return () => observer.disconnect();
  }, []); // Empty dependency array ensures this runs once on mount

  // ============================================================
  // EFFECT: HASH-BASED SCROLL NAVIGATION
  // ============================================================

  /**
   * Handles navigation from hash URLs (e.g., #features, #how-it-works).
   * When the component mounts with a hash in the URL, this scrolls smoothly
   * to the corresponding section element.
   */
  useEffect(() => {
    // Exit early if no hash is present in the URL
    if (!window.location.hash) {
      return;
    }

    // Find the target section using the hash value (removing the # character)
    const section = document.getElementById(window.location.hash.slice(1));
    if (!section) {
      return; // Exit if no matching element is found
    }

    // Schedule the scroll in the next animation frame for smooth rendering
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []); // Empty dependency array ensures this runs once on mount

  // ============================================================
  // RENDER: LANDING PAGE UI
  // ============================================================

  return (
    <main className="landing-page">
      {/* ===== TOP NAVIGATION BAR ===== */}
      {/* PublicTopbar provides navigation links for unauthenticated users */}
      <PublicTopbar />

      {/* ===== HERO SECTION ===== */}
      {/* Main banner with background image, headline, call-to-action buttons, and preview card */}
      <section className="landing-hero" id="home" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-layout">
          {/* Left side: Text content and actions */}
          <div className="hero-content">
            <h1>Smart Travel Planner</h1>
            <p className="hero-copy">
              Plan every trip with calm, clear decisions by organizing destinations,
              budgets, weather, attractions, transport and checklists in one workspace.
            </p>
            <div className="hero-actions">
              {/* Primary CTA: Login for existing users */}
              <Link className="primary-action" to="/login">
                Login
              </Link>
              {/* Secondary CTA: Register for new users */}
              <Link className="secondary-action" to="/register">
                Sign Up
              </Link>
            </div>
          </div>

          {/* Right side: Interactive preview card showing a sample trip overview */}
          <div className="hero-preview" aria-label="Planner preview">
            {/* Preview header with window controls and title */}
            <div className="preview-header">
              <div>
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
              </div>
              <strong>Trip overview</strong>
            </div>
            
            {/* Destination summary section */}
            <div className="preview-destination">
              <div>
                <p>Upcoming plan</p>
                <h2>Tokyo spring escape</h2>
              </div>
              <span>Ready</span>
            </div>
            
            {/* Quick stats grid: Weather, Budget, Destinations, Itinerary */}
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
            
            {/* Progress bar showing planning completion */}
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

      {/* ===== HIGHLIGHTS STRIP ===== */}
      {/* Three key selling points displayed as cards in a horizontal strip */}
      <section className="landing-strip reveal-on-scroll" aria-label="Platform highlights">
        {highlights.map(([Icon, title, copy]) => (
          <article className="highlight-card" key={title}>
            <Icon size={22} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      {/* ===== FEATURES SECTION ===== */}
      {/* Comprehensive grid of all application features with visual showcase */}
      <section className="landing-section feature-section reveal-on-scroll" id="features">
        {/* Showcase area: Visual representation of features */}
        <div className="section-showcase section-showcase-feature">
          {/* Section heading with description and keyword tags */}
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
          
          {/* Visual mockup showing a sample trip card and details */}
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
        
        {/* Feature grid: All individual features displayed as tiles */}
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

      {/* ===== HOW IT WORKS SECTION ===== */}
      {/* Three-step workflow guide from trip creation to preparation */}
      <section className="landing-section workflow-section reveal-on-scroll" id="how-it-works">
        {/* Showcase area with visual map pins and section heading */}
        <div className="section-showcase section-showcase-workflow">
          {/* Visual map with pin markers representing the workflow steps */}
          <div className="workflow-map" aria-hidden="true">
            <span className="map-pin map-pin-one"><MapPinned size={18} /></span>
            <span className="map-route" />
            <span className="map-pin map-pin-two"><ListChecks size={18} /></span>
            <span className="map-route map-route-second" />
            <span className="map-pin map-pin-three"><CheckCircle2 size={18} /></span>
          </div>
          
          {/* Section heading with description and keyword tags */}
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
        
        {/* Timeline: Sequential steps with step numbers */}
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

      {/* ===== SAFETY SECTION ===== */}
      {/* Security and privacy features with trust signals */}
      <section className="landing-section split-section reveal-on-scroll" id="safety">
        {/* Section heading with security messaging */}
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
        
        {/* Security list: Individual security features displayed as cards */}
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

      {/* ===== FOR TRAVELLERS SECTION ===== */}
      {/* Different traveller personas and their supported workflows */}
      <section className="landing-section stack-section reveal-on-scroll" id="travellers">
        {/* Showcase area with visual representation of planning support */}
        <div className="section-showcase section-showcase-travellers">
          {/* Section heading with traveller-focused messaging */}
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
          
          {/* Visual tag cloud showing planning support categories */}
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
        
        {/* Stack row: All traveller types displayed as pill cards */}
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

      {/* ===== FOOTER ===== */}
      {/* Site footer with brand information and navigation links */}
      <footer className="landing-footer">
        <div>
          {/* Brand mark with logo image */}
          <Link className="brand-mark footer-brand" to="/">
            <img className="brand-logo" src={logo} alt="" aria-hidden="true" />
            Smart Travel Planner
          </Link>
          <p>6003CEM Web API Development group project.</p>
        </div>
        
        {/* Footer navigation: Links to page sections */}
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

// ============================================================
// EXPORT
// ============================================================

/**
 * Default export registers the primary LandingPage component.
 * This is the main export consumed by the router or parent components.
 */
export default LandingPage;
