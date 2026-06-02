/**
 * Dashboard utilities.
 * Pure helpers centralize date ranges, trip grouping, destination normalization, and chart geometry.
 */
export const formatDateKey = (date) => date.toISOString().slice(0, 10);

export const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getMonthBounds = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  return { start, end };
};

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

export const buildCalendarCells = (monthDate, dayLookup, tripLookup) => {
  const { start, end } = getMonthBounds(monthDate);
  const previousMonthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0).getDate();
  const cells = [];

  for (let index = 0; index < start.getDay(); index += 1) {
    const day = previousMonthEnd - start.getDay() + index + 1;
    cells.push({ key: `previous-${day}`, day, outsideMonth: true });
  }

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

  const trailingDays = 42 - cells.length;
  for (let index = 1; index <= trailingDays; index += 1) {
    cells.push({ key: `next-${index}`, day: index, outsideMonth: true });
  }

  return cells;
};

export const getVisitCount = (place) => (place.visits || []).reduce((total, visit) => total + Number(visit.visitCount || 1), 0);

export const getDatedVisitCount = (place) =>
  (place.visits || [])
    .filter((visit) => visit.visitedDate)
    .reduce((total, visit) => total + Number(visit.visitCount || 1), 0);

export const getLatestVisitLabel = (place) => {
  const latestDate = place.latestVisitedDate || (place.visits || []).find((visit) => visit.visitedDate)?.visitedDate;
  return latestDate ? new Date(latestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date saved';
};

export const getTypeLabel = (type) => String(type || 'place').replace(/-/g, ' ');

export const formatShortDate = (date) => (date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date');

export const formatLongDate = (dateKey) =>
  parseDateKey(dateKey).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

export const formatDateRange = (startDate, endDate) => `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;

export const normalizeVisitText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const getDisplayName = (user) => user?.name || user?.fullName || user?.username || user?.email?.split('@')[0] || 'Traveler';

export const getTripDestinationPlaces = (trip = {}) => {
  if (trip.destinationSegments?.length) {
    return trip.destinationSegments.map((segment) => ({
      title: segment.placeName || segment.city,
      name: segment.placeName || segment.city,
      address: [segment.city, segment.country].filter(Boolean).join(', '),
      country: segment.country,
      startDate: segment.startDate || trip.startDate,
      endDate: segment.endDate || trip.endDate,
      tripId: trip._id,
      tripTitle: trip.title || trip.destination,
    }));
  }

  return trip.destination
    ? [{
      title: trip.destination,
      name: trip.destination,
      address: [trip.destination, trip.country].filter(Boolean).join(', '),
      country: trip.country,
      startDate: trip.startDate,
      endDate: trip.endDate,
      tripId: trip._id,
      tripTitle: trip.title || trip.destination,
    }]
    : [];
};

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

export const getPlaceImageStyle = (seed = '') => ({
  backgroundImage: `linear-gradient(135deg, rgba(15, 159, 137, 0.12), rgba(47, 111, 237, 0.18)), url("https://source.unsplash.com/240x180/?travel,${encodeURIComponent(seed || 'destination')}")`,
});

export const deferStateUpdate = (callback) => {
  Promise.resolve().then(callback);
};
