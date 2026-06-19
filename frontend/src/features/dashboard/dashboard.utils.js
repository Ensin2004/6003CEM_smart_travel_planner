/**
 * Dashboard utilities.
 * Pure helpers centralize date ranges, trip grouping, destination normalization, and chart geometry.
 */
import { Country } from 'country-state-city';
import { getPlaceImageSrc } from '../../utils/placeImageProxy';
import landingHeroImage from '../../assets/landing-hero.png';

/**
 * Format a date object into YYYY-MM-DD string key
 * Used for consistent date identification across the application
 */
export const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a YYYY-MM-DD date key back into a Date object
 * Inverse operation of formatDateKey
 */
export const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get the first and last day of the month for a given date
 * Returns start and end Date objects for month boundaries
 */
export const getMonthBounds = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  return { start, end };
};

/**
 * Check if a date key falls within a given date range
 * Compares normalized dates with time set to midnight
 */
export const isDateWithinRange = (dateKey, startDate, endDate) => {
  if (!dateKey || !startDate || !endDate) return false;
  const selected = parseDateKey(dateKey);
  const start = new Date(startDate);
  const end = new Date(endDate);
  selected.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return selected >= start && selected <= end;
};

/**
 * Build a complete calendar grid for a given month
 * Includes cells from previous/next months to fill the grid
 * Integrates lookup data for places and trips on each date
 */
export const buildCalendarCells = (monthDate, dayLookup, tripLookup) => {
  const { start, end } = getMonthBounds(monthDate);
  const previousMonthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0).getDate();
  const cells = [];

  // Add days from previous month to fill first week
  for (let index = 0; index < start.getDay(); index += 1) {
    const day = previousMonthEnd - start.getDay() + index + 1;
    cells.push({ key: `previous-${day}`, day, outsideMonth: true });
  }

  // Add days of the current month
  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    cells.push({
      key: dateKey,
      dateKey,
      day,
      places: dayLookup[dateKey] || [],
      destinations: tripLookup[dateKey] || [],
    });
  }

  // Add days from next month to complete the grid (6 rows)
  const trailingDays = 42 - cells.length;
  for (let index = 1; index <= trailingDays; index += 1) {
    cells.push({ key: `next-${index}`, day: index, outsideMonth: true });
  }

  return cells;
};

/**
 * Calculate total visit count from all visits of a place
 * Sums visitCount values, defaulting to 1 if not specified
 */
export const getVisitCount = (place) => (place.visits || []).reduce((total, visit) => total + Number(visit.visitCount || 1), 0);

/**
 * Calculate total visits that have a specific visited date
 * Excludes visits without a date
 */
export const getDatedVisitCount = (place) =>
  (place.visits || [])
    .filter((visit) => visit.visitedDate)
    .reduce((total, visit) => total + Number(visit.visitCount || 1), 0);

/**
 * Get formatted label for the latest visit date
 * Returns formatted date or fallback message
 */
export const getLatestVisitLabel = (place) => {
  const latestDate = place.latestVisitedDate || (place.visits || []).find((visit) => visit.visitedDate)?.visitedDate;
  return latestDate ? new Date(latestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date saved';
};

/**
 * Format a type identifier into a readable label
 * Replaces hyphens with spaces for display
 */
export const getTypeLabel = (type) => String(type || 'place').replace(/-/g, ' ');

/**
 * Format date to short display format (Mon DD)
 */
export const formatShortDate = (date) => (date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date');

/**
 * Format date key to long display format (Month DD, YYYY)
 */
export const formatLongDate = (dateKey) =>
  parseDateKey(dateKey).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

/**
 * Format a date range for display
 * Combines start and end dates into a single range string
 */
export const formatDateRange = (startDate, endDate) => `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;

/**
 * Normalize text for comparison purposes
 * Converts to lowercase, trims, and collapses whitespace
 */
export const normalizeVisitText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Extract country from the end of a comma-separated address string
 * Returns the last non-empty part of the address
 */
export const getCountryFromText = (value) => {
  const parts = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[parts.length - 1] || '';
};

// Build a set of all known country names for validation
const knownCountryNames = new Set(Country.getAllCountries().map((country) => country.name.toLowerCase()));

/**
 * Normalize a country name to standard capitalization
 * Matches against known country list or formats properly
 */
const normalizeCountryName = (value) => {
  const name = String(value || '').trim();
  if (!name) return '';

  const countryMatch = Country.getAllCountries().find((country) => country.name.toLowerCase() === name.toLowerCase());
  if (countryMatch) return countryMatch.name;

  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Extract the country from a place object
 * Checks multiple possible fields and fallbacks to address parsing
 */
export const getPlaceCountry = (place = {}) => {
  const explicitCountry = place.country || place.location?.country || place.destinationCountry;
  if (explicitCountry) return normalizeCountryName(explicitCountry);

  const textCountry = getCountryFromText(place.address || place.displayName || '');
  if (textCountry) return normalizeCountryName(textCountry);

  const name = String(place.title || place.name || '').trim();
  return knownCountryNames.has(name.toLowerCase()) ? normalizeCountryName(name) : '';
};

/**
 * Build country rows with counts from a list of country names
 * Groups by country and sorts by count descending
 */
export const buildCountryRows = (countries = []) => {
  const counts = countries.map(normalizeCountryName).filter(Boolean).reduce((lookup, country) => ({
    ...lookup,
    [country]: (lookup[country] || 0) + 1,
  }), {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((firstCountry, secondCountry) => secondCountry.value - firstCountry.value || firstCountry.label.localeCompare(secondCountry.label));
};

/**
 * Get a time-appropriate greeting based on current hour
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Get the display name for a user from various possible fields
 * Falls back to email prefix or generic traveler
 */
export const getDisplayName = (user) => user?.name || user?.fullName || user?.username || user?.email?.split('@')[0] || 'Traveler';

/**
 * Extract destination places from a trip object
 * Handles both segmented trips and simple destination fields
 * Filters out "not added yet" placeholders
 */
export const getTripDestinationPlaces = (trip = {}) => {
  if (trip.destinationSegments?.length) {
    return trip.destinationSegments
      .filter((segment) => segment.city && normalizeVisitText(segment.city) !== 'not added yet')
      .map((segment) => ({
        title: segment.placeName && normalizeVisitText(segment.placeName) !== 'not added yet'
          ? segment.placeName
          : segment.city,
        name: segment.placeName && normalizeVisitText(segment.placeName) !== 'not added yet'
          ? segment.placeName
          : segment.city,
        address: [segment.city, segment.country].filter(Boolean).join(', '),
        country: segment.country,
        imageUrl: segment.imageUrl,
        imageUrls: segment.imageUrls,
        startDate: segment.startDate || trip.startDate,
        endDate: segment.endDate || trip.endDate,
        tripId: trip._id,
        tripTitle: trip.title || trip.destination,
      }));
  }

  return trip.destination && normalizeVisitText(trip.destination) !== 'not added yet'
    ? [{
      title: trip.destination,
      name: trip.destination,
      address: [trip.destination, trip.country].filter(Boolean).join(', '),
      country: trip.country,
      imageUrl: trip.imageUrl,
      imageUrls: trip.imageUrls,
      startDate: trip.startDate,
      endDate: trip.endDate,
      tripId: trip._id,
      tripTitle: trip.title || trip.destination,
    }]
    : [];
};

/**
 * Group trips by status relative to today's date
 * Returns active, upcoming, and past trip groups
 */
export const getTripStatusGroups = (trips = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return trips.reduce(
    (groups, trip) => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      if (endDate < today) groups.past.push(trip);
      else if (startDate <= today && endDate >= today) groups.active.push(trip);
      else groups.upcoming.push(trip);
      return groups;
    },
    { active: [], upcoming: [], past: [] }
  );
};

/**
 * Generate donut chart segments from data items
 * Calculates dasharray values for SVG circle segments
 */
export const getDonutSegments = (items) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 25;

  return items.map((item) => {
    const length = total ? (item.value / total) * 100 : 0;
    const segment = { ...item, dasharray: `${length} ${100 - length}`, dashoffset: offset };
    offset -= length;
    return segment;
  });
};

/**
 * Generate CSS background image style for a place
 * Uses place image or falls back to hero image with gradient overlay
 */
export const getPlaceImageStyle = (place = {}) => {
  const normalizedPlace = typeof place === 'string' ? { title: place } : place;
  const imageUrl = getPlaceImageSrc(
    normalizedPlace.imageUrl ||
    normalizedPlace.imageUrls?.[0] ||
    normalizedPlace.photoUrl ||
    normalizedPlace.thumbnail
  );

  return {
    backgroundImage: `linear-gradient(135deg, rgba(15, 159, 137, 0.08), rgba(47, 111, 237, 0.12)), url("${imageUrl || landingHeroImage}")`,
  };
};

/**
 * Defer a state update to the next microtask
 * Prevents React state updates during render
 */
export const deferStateUpdate = (callback) => {
  Promise.resolve().then(callback);
};
