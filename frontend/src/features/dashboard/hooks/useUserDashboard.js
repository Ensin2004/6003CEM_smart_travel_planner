/**
 * User dashboard hook.
 * Data loading, derived dashboard metrics, filters, and interaction state stay isolated from view components.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFavorites } from '../../../api/favoriteApi';
import { getTripItinerary } from '../../../api/itineraryApi';
import { getTrips } from '../../../api/tripApi';
import { enrichVisitedPlaceImages, getVisitedCalendar, getVisitedPlaces } from '../../../api/visitedPlaceApi';
import { buildVisitedLookup, getVisitedPlacePayload } from '../../../components/visitedPlaces/visitedPlaceUtils';
import useAuth from '../../../hooks/useAuth';
import {
  buildCalendarCells,
  deferStateUpdate,
  formatDateKey,
  formatDateRange,
  getDatedVisitCount,
  getDonutSegments,
  getLatestVisitLabel,
  buildCountryRows,
  getPlaceCountry,
  getMonthBounds,
  getTripDestinationPlaces,
  getTripStatusGroups,
  getTypeLabel,
  getVisitCount,
  isDateWithinRange,
  normalizeVisitText,
} from '../dashboard.utils';

// Predefined color palette for chart segments
const chartColors = ['#0f9f89', '#2f6fed', '#f4a22c', '#9b6df3', '#0ea5b7', '#e05252'];

const isRangeActive = ({ startDate, endDate }) => Boolean(startDate || endDate);

const isDateInsideFilter = (dateValue, { startDate, endDate }) => {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  date.setHours(0, 0, 0, 0);
  start?.setHours(0, 0, 0, 0);
  end?.setHours(0, 0, 0, 0);

  return (!start || date >= start) && (!end || date <= end);
};

const doesTripOverlapFilter = (trip, dateRangeFilter) => {
  if (!isRangeActive(dateRangeFilter)) return true;

  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  const filterStart = dateRangeFilter.startDate ? new Date(dateRangeFilter.startDate) : null;
  const filterEnd = dateRangeFilter.endDate ? new Date(dateRangeFilter.endDate) : null;
  tripStart.setHours(0, 0, 0, 0);
  tripEnd.setHours(0, 0, 0, 0);
  filterStart?.setHours(0, 0, 0, 0);
  filterEnd?.setHours(0, 0, 0, 0);

  return (!filterEnd || tripStart <= filterEnd) && (!filterStart || tripEnd >= filterStart);
};

const getLatestVisitDate = (visits) =>
  visits
    .map((visit) => visit.visitedDate)
    .filter(Boolean)
    .sort((firstDate, secondDate) => new Date(secondDate) - new Date(firstDate))[0];

const getTripDurationDays = (trip) => {
  if (!trip.startDate || !trip.endDate) return 0;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

const buildCountRows = (items, getLabel, colors = chartColors) => {
  const counts = items.reduce((lookup, item) => {
    const label = getLabel(item);
    if (!label) return lookup;
    return { ...lookup, [label]: (lookup[label] || 0) + 1 };
  }, {});

  return Object.entries(counts)
    .map(([label, value], index) => ({ label, value, color: colors[index % colors.length] }))
    .sort((firstRow, secondRow) => secondRow.value - firstRow.value || firstRow.label.localeCompare(secondRow.label));
};

export function useUserDashboard() {
  // Authentication hook for current user
  const { user } = useAuth();
  
  // State for month navigation and date selection
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  
  // Filter and UI interaction states
  const [searchTerm, setSearchTerm] = useState('');
  const [visitedCategory, setVisitedCategory] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ startDate: '', endDate: '' });
  const [openCategoryMenu, setOpenCategoryMenu] = useState('');
  const [activePlaceMenu, setActivePlaceMenu] = useState('');
  const [activeReport, setActiveReport] = useState('');
  
  // Data states for dashboard content
  const [days, setDays] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripItineraryDays, setTripItineraryDays] = useState({});
  
  // Status and error states for async operations
  const [tripStatus, setTripStatus] = useState('loading');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const hasDateRangeFilter = isRangeActive(dateRangeFilter);

  const updateDateRangeFilter = useCallback((field, value) => {
    setDateRangeFilter((currentFilter) => {
      const nextFilter = { ...currentFilter, [field]: value };

      if (nextFilter.startDate && nextFilter.endDate && nextFilter.startDate > nextFilter.endDate) {
        if (field === 'startDate') nextFilter.endDate = value;
        else nextFilter.startDate = value;
      }

      return nextFilter;
    });
  }, []);

  const clearDateRangeFilter = useCallback(() => {
    setDateRangeFilter({ startDate: '', endDate: '' });
  }, []);

  const filteredTrips = useMemo(
    () => trips.filter((trip) => doesTripOverlapFilter(trip, dateRangeFilter)),
    [dateRangeFilter, trips]
  );

  const filteredVisitedPlaces = useMemo(() => {
    if (!hasDateRangeFilter) return visitedPlaces;

    return visitedPlaces
      .map((place) => {
        const filteredVisits = (place.visits || []).filter((visit) => isDateInsideFilter(visit.visitedDate, dateRangeFilter));
        return {
          ...place,
          visits: filteredVisits,
          latestVisitedDate: getLatestVisitDate(filteredVisits),
        };
      })
      .filter((place) => place.visits.length);
  }, [dateRangeFilter, hasDateRangeFilter, visitedPlaces]);

  // Build lookup for visited places by key
  const dayLookup = useMemo(
    () => days.reduce((lookup, day) => {
      if (hasDateRangeFilter && !isDateInsideFilter(day.date, dateRangeFilter)) return lookup;
      return { ...lookup, [day.date]: day.places || [] };
    }, {}),
    [dateRangeFilter, days, hasDateRangeFilter]
  );

  const visitedLookup = useMemo(() => buildVisitedLookup(filteredVisitedPlaces), [filteredVisitedPlaces]);

  const isDestinationVisited = useCallback((destination) => {
    const payload = getVisitedPlacePayload({
      item: destination,
      type: 'location',
      source: 'trips',
      tripId: destination.tripId,
    });

    if (visitedLookup[payload.placeKey]) return true;

    const destinationTitle = normalizeVisitText(destination.title || destination.name);
    const destinationAddress = normalizeVisitText(destination.address);

    return filteredVisitedPlaces.some((place) => {
      const placeTitle = normalizeVisitText(place.title);
      const placeAddress = normalizeVisitText(place.address);
      return place.type === 'location' && placeTitle === destinationTitle && (!destinationAddress || placeAddress === destinationAddress);
    });
  }, [filteredVisitedPlaces, visitedLookup]);

  const allTripDestinationRows = useMemo(() =>
    filteredTrips.flatMap((trip) =>
      getTripDestinationPlaces(trip).map((destination) => ({
        ...destination,
        visited: isDestinationVisited(destination),
      }))
    ), [filteredTrips, isDestinationVisited]);

  const calendarTripRows = useMemo(() =>
    filteredTrips.flatMap((trip) => {
      const destinations = getTripDestinationPlaces(trip);
      if (destinations.length) return destinations;

      return [{
        title: trip.title || 'Untitled trip',
        name: trip.title || 'Untitled trip',
        address: 'Destination not added yet',
        country: trip.country,
        startDate: trip.startDate,
        endDate: trip.endDate,
        tripId: trip._id,
        tripTitle: trip.title || 'Untitled trip',
      }];
    }), [filteredTrips]);

  const tripDestinationLookup = useMemo(() => {
    const { start, end } = getMonthBounds(monthDate);
    return calendarTripRows.reduce((lookup, destination) => {
      const startCursor = new Date(destination.startDate);
      const endCursor = new Date(destination.endDate);
      startCursor.setHours(0, 0, 0, 0);
      endCursor.setHours(0, 0, 0, 0);

      for (let cursor = new Date(startCursor); cursor <= endCursor; cursor.setDate(cursor.getDate() + 1)) {
        if (cursor < start || cursor > end) continue;
        const dateKey = formatDateKey(cursor);
        lookup[dateKey] = [...(lookup[dateKey] || []), destination];
      }

      return lookup;
    }, {});
  }, [calendarTripRows, monthDate]);
  
  // Generate calendar cells for the current month
  const calendarCells = useMemo(() => buildCalendarCells(monthDate, dayLookup, tripDestinationLookup), [dayLookup, monthDate, tripDestinationLookup]);

  const tripGroups = useMemo(() => getTripStatusGroups(filteredTrips), [filteredTrips]);

  const sortedUpcomingTrips = useMemo(
    () => [...tripGroups.active, ...tripGroups.upcoming].sort((firstTrip, secondTrip) => new Date(firstTrip.startDate) - new Date(secondTrip.startDate)),
    [tripGroups]
  );
  
  // Get top 3 upcoming trips with destinations
  const upcomingTrips = useMemo(
    () => sortedUpcomingTrips.filter((trip) => getTripDestinationPlaces(trip).length > 0).slice(0, 3),
    [sortedUpcomingTrips]
  );
  
  // Get destinations and visits for the selected date
  const selectedDestinations = useMemo(
    () => calendarTripRows.filter((destination) => isDateWithinRange(selectedDateKey, destination.startDate, destination.endDate)),
    [calendarTripRows, selectedDateKey]
  );
  const selectedVisits = dayLookup[selectedDateKey] || [];

  const visitedPlaceRows = useMemo(() => filteredVisitedPlaces.map((place) => ({
    ...place,
    totalVisits: getVisitCount(place),
    datedVisits: getDatedVisitCount(place),
    undatedVisits: (place.visits || [])
      .filter((visit) => !visit.visitedDate)
      .reduce((total, visit) => total + Number(visit.visitCount || 1), 0),
    latestVisitLabel: getLatestVisitLabel(place),
  })), [filteredVisitedPlaces]);

  const visitedCategories = useMemo(() => [
    'all',
    ...new Set(visitedPlaceRows.map((place) => getTypeLabel(place.type)).filter(Boolean)),
  ], [visitedPlaceRows]);
  
  // Filter and search visited places based on category and search term
  const placeRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = visitedCategory === 'all'
      ? visitedPlaceRows
      : visitedPlaceRows.filter((place) => getTypeLabel(place.type) === visitedCategory);

    if (!normalizedSearch) return rows;

    return rows.filter((place) =>
      [place.title, place.address, place.type, place.source]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [searchTerm, visitedCategory, visitedPlaceRows]);
  
  // Get unvisited trip destinations
  const tripPlaceRows = useMemo(
    () => allTripDestinationRows.filter((destination) => !destination.visited),
    [allTripDestinationRows]
  );

  const filteredItineraryDestinationRows = useMemo(() => (
    Object.values(tripItineraryDays)
      .flat()
      .filter((destination) => doesTripOverlapFilter(destination, dateRangeFilter))
  ), [dateRangeFilter, tripItineraryDays]);

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const totalVisitCount = filteredVisitedPlaces.reduce((total, place) => total + getVisitCount(place), 0);
  const uniquePlaceCount = filteredVisitedPlaces.length;
  const placeToVisitCount = tripPlaceRows.length;
  const tripsThisMonth = filteredTrips.filter((trip) => {
    const { start, end } = getMonthBounds(monthDate);
    return new Date(trip.startDate) <= end && new Date(trip.endDate) >= start;
  }).length;
  
  // Build recent activity feed
  const recentActivity = useMemo(() => [
    ...placeRows.slice(0, 2).map((place) => ({
      id: `visited-${place._id || place.placeKey}`,
      type: 'visited',
      tone: 'green',
      title: `Visited ${place.title}`,
      meta: place.latestVisitLabel,
    })),
    ...sortedUpcomingTrips.slice(0, 1).map((trip) => ({
      id: `trip-${trip._id}`,
      type: 'trip',
      tone: 'purple',
      title: `Created trip ${trip.title || trip.destination}`,
      meta: formatDateRange(trip.startDate, trip.endDate),
    })),
  ], [placeRows, sortedUpcomingTrips]);
  
  // Aggregate visit counts by type category
  const visitTypeRows = useMemo(() => {
    const typeCounts = filteredVisitedPlaces.reduce((counts, place) => {
      const type = getTypeLabel(place.type);
      return { ...counts, [type]: (counts[type] || 0) + getVisitCount(place) };
    }, {});

    return Object.entries(typeCounts)
      .map(([label, value], index) => ({ label, value, color: chartColors[index % chartColors.length] }))
      .sort((firstRow, secondRow) => secondRow.value - firstRow.value)
      .slice(0, 4);
  }, [filteredVisitedPlaces]);

  const visitDonutSegments = useMemo(() => getDonutSegments(visitTypeRows), [visitTypeRows]);
  
  // Generate segments for visited vs to-visit comparison
  const visitedVsToVisitSegments = useMemo(() => getDonutSegments([
    { label: 'Visited', value: uniquePlaceCount, color: '#0f9f89' },
    { label: 'To Visit', value: placeToVisitCount, color: '#9b6df3' },
  ]), [placeToVisitCount, uniquePlaceCount]);
  
  // Calculate percentage of visited places
  const visitedShare = uniquePlaceCount + placeToVisitCount
    ? Math.round((uniquePlaceCount / (uniquePlaceCount + placeToVisitCount)) * 100)
    : 0;
  
  // Generate country-level insights from places and destinations
  const countryInsights = useMemo(() => {
    const visitedCountryRows = buildCountryRows([
      ...filteredVisitedPlaces.map((place) => getPlaceCountry(place)),
      ...allTripDestinationRows.filter((destination) => destination.visited).map((destination) => destination.country),
    ]);
    const nextCountryRows = buildCountryRows(
      [...allTripDestinationRows, ...filteredItineraryDestinationRows]
        .filter((destination) => !destination.visited)
        .sort((firstDestination, secondDestination) => new Date(firstDestination.startDate) - new Date(secondDestination.startDate))
        .map((destination) => destination.country || getPlaceCountry(destination))
    );
    const topCountryValue = Math.max(
      ...visitedCountryRows.map((row) => row.value),
      ...nextCountryRows.map((row) => row.value),
      1
    );

    return {
      visitedCountries: visitedCountryRows,
      nextCountries: nextCountryRows,
      topCountryValue,
      visitedCountryCount: visitedCountryRows.length,
      nextCountryCount: nextCountryRows.length,
      visitedCountryNames: visitedCountryRows.map((row) => row.label),
      nextCountryNames: nextCountryRows.map((row) => row.label),
    };
  }, [allTripDestinationRows, filteredItineraryDestinationRows, filteredVisitedPlaces]);

  const monthlyTripCounts = useMemo(() => {
    const year = monthDate.getFullYear();
    return Array.from({ length: 12 }, (_, index) => {
      const monthStart = new Date(year, index, 1);
      const monthEnd = new Date(year, index + 1, 0);
      return filteredTrips.filter((trip) => new Date(trip.startDate) <= monthEnd && new Date(trip.endDate) >= monthStart).length;
    });
  }, [filteredTrips, monthDate]);
  const maxMonthlyTripCount = Math.max(...monthlyTripCounts, 1);
  const monthlyVisitCounts = useMemo(() => {
    const year = monthDate.getFullYear();
    const counts = Array.from({ length: 12 }, () => 0);

    filteredVisitedPlaces.forEach((place) => {
      (place.visits || []).forEach((visit) => {
        if (!visit.visitedDate) return;
        const visitDate = new Date(visit.visitedDate);
        if (visitDate.getFullYear() !== year) return;
        counts[visitDate.getMonth()] += Number(visit.visitCount || 1);
      });
    });

    return counts;
  }, [filteredVisitedPlaces, monthDate]);

  const dashboardChartData = useMemo(() => {
    const tripStatusRows = [
      { label: 'Active', value: tripGroups.active.length, color: '#0f9f89' },
      { label: 'Upcoming', value: tripGroups.upcoming.length, color: '#2f6fed' },
      { label: 'Past', value: tripGroups.past.length, color: '#9b6df3' },
    ];
    const placeSourceRows = buildCountRows(visitedPlaceRows, (place) => getTypeLabel(place.source || 'manual')).slice(0, 5);
    const topPlaceRows = [...visitedPlaceRows]
      .sort((firstPlace, secondPlace) => Number(secondPlace.totalVisits || 0) - Number(firstPlace.totalVisits || 0))
      .slice(0, 6)
      .map((place, index) => ({
        label: place.title || 'Untitled place',
        value: Number(place.totalVisits || 0),
        color: chartColors[index % chartColors.length],
      }));
    const countryRows = [
      ...(countryInsights?.visitedCountries || []).map((row) => ({ ...row, color: '#0f9f89', group: 'Visited' })),
      ...(countryInsights?.nextCountries || []).map((row, index) => ({
        ...row,
        color: ['#2f6fed', '#9b6df3', '#f4a22c'][index % 3],
        group: 'To visit',
      })),
    ].slice(0, 8);
    const tripDurationRows = [
      { label: '1-3 days', min: 1, max: 3, color: '#0f9f89' },
      { label: '4-7 days', min: 4, max: 7, color: '#2f6fed' },
      { label: '8-14 days', min: 8, max: 14, color: '#f4a22c' },
      { label: '15+ days', min: 15, max: Infinity, color: '#9b6df3' },
    ].map((bucket) => ({
      ...bucket,
      value: filteredTrips.filter((trip) => {
        const days = getTripDurationDays(trip);
        return days >= bucket.min && days <= bucket.max;
      }).length,
    }));
    const visitDateRows = [
      { label: 'Dated visits', value: visitedPlaceRows.reduce((total, place) => total + Number(place.datedVisits || 0), 0), color: '#0f9f89' },
      { label: 'No date saved', value: visitedPlaceRows.reduce((total, place) => total + Number(place.undatedVisits || 0), 0), color: '#e05252' },
    ];
    const planningRows = [
      { label: 'Visited places', value: uniquePlaceCount, color: '#0f9f89' },
      { label: 'Places to visit', value: placeToVisitCount, color: '#9b6df3' },
      { label: 'Saved places', value: favorites.length, color: '#f4a22c' },
    ];

    return {
      countryRows,
      monthlyVisitCounts,
      placeSourceRows,
      planningRows,
      topPlaceRows,
      tripDurationRows,
      tripStatusRows,
      visitDateRows,
    };
  }, [
    countryInsights,
    favorites.length,
    filteredTrips,
    monthlyVisitCounts,
    placeToVisitCount,
    tripGroups,
    uniquePlaceCount,
    visitedPlaceRows,
  ]);

  const userStatistics = useMemo(() => {
    const tripDurations = filteredTrips.map((trip) => ({
      trip,
      days: getTripDurationDays(trip),
    }));
    const totalTripDays = tripDurations.reduce((total, row) => total + row.days, 0);
    const longestTrip = tripDurations.reduce((longest, row) => (row.days > longest.days ? row : longest), { trip: null, days: 0 });
    const mostVisitedPlace = visitedPlaceRows.reduce(
      (topPlace, place) => (Number(place.totalVisits || 0) > Number(topPlace?.totalVisits || 0) ? place : topPlace),
      null
    );
    const totalDatedVisits = visitedPlaceRows.reduce((total, place) => total + Number(place.datedVisits || 0), 0);
    const totalUndatedVisits = visitedPlaceRows.reduce((total, place) => total + Number(place.undatedVisits || 0), 0);
    const tripDestinationCount = allTripDestinationRows.length;
    const visitedTripDestinationCount = allTripDestinationRows.filter((destination) => destination.visited).length;
    const busiestMonthIndex = monthlyTripCounts.reduce(
      (topIndex, count, index) => (count > monthlyTripCounts[topIndex] ? index : topIndex),
      0
    );
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      averageTripDays: filteredTrips.length ? (totalTripDays / filteredTrips.length).toFixed(1) : '0',
      averageVisitsPerPlace: uniquePlaceCount ? (totalVisitCount / uniquePlaceCount).toFixed(1) : '0',
      busiestMonth: {
        label: monthNames[busiestMonthIndex],
        value: monthlyTripCounts[busiestMonthIndex] || 0,
      },
      completionRate: uniquePlaceCount + placeToVisitCount
        ? Math.round((uniquePlaceCount / (uniquePlaceCount + placeToVisitCount)) * 100)
        : 0,
      countryTotal: (countryInsights?.visitedCountryCount || 0) + (countryInsights?.nextCountryCount || 0),
      datedVisitShare: totalVisitCount ? Math.round((totalDatedVisits / totalVisitCount) * 100) : 0,
      longestTrip: {
        days: longestTrip.days,
        title: longestTrip.trip?.title || longestTrip.trip?.destination || 'No trips yet',
      },
      mostVisitedPlace: {
        title: mostVisitedPlace?.title || 'No visits yet',
        visits: mostVisitedPlace?.totalVisits || 0,
      },
      savedPlaceShare: uniquePlaceCount ? Math.round((favorites.length / uniquePlaceCount) * 100) : 0,
      topCategory: {
        label: visitTypeRows[0]?.label || 'No category yet',
        value: visitTypeRows[0]?.value || 0,
      },
      totalDatedVisits,
      totalTripDays,
      totalUndatedVisits,
      tripDestinationCount,
      tripDestinationProgress: tripDestinationCount ? Math.round((visitedTripDestinationCount / tripDestinationCount) * 100) : 0,
      visitedTripDestinationCount,
    };
  }, [
    allTripDestinationRows,
    countryInsights,
    favorites.length,
    filteredTrips,
    monthlyTripCounts,
    placeToVisitCount,
    totalVisitCount,
    uniquePlaceCount,
    visitTypeRows,
    visitedPlaceRows,
  ]);

  // Fetch visited calendar data when month changes
  useEffect(() => {
    const { start, end } = getMonthBounds(monthDate);
    let isActive = true;

    deferStateUpdate(() => {
      if (!isActive) return;
      setStatus('loading');
      setError('');
    });
    getVisitedCalendar({
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
    })
      .then((response) => {
        if (!isActive) return;
        setDays(response.data?.data?.days || []);
        setStatus('success');
      })
      .catch((requestError) => {
        if (!isActive) return;
        setError(requestError.response?.data?.message || 'Unable to load visited calendar.');
        setStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [monthDate]);

  // Fetch favorites data
  useEffect(() => {
    let isActive = true;

    getFavorites()
      .then((response) => {
        if (isActive) setFavorites(response.data?.data?.favorites || []);
      })
      .catch(() => {
        if (isActive) setFavorites([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Fetch trip itineraries for all trips
  useEffect(() => {
    let isActive = true;

    if (!trips.length) {
      deferStateUpdate(() => {
        if (isActive) setTripItineraryDays({});
      });
      return () => {
        isActive = false;
      };
    }

    Promise.allSettled(trips.map(async (trip) => {
      const response = await getTripItinerary(trip._id);
      const days = response.data?.data?.days || [];
      return [
        trip._id,
        days
          .filter((day) => day.location?.name || day.location?.country)
          .map((day) => ({
            title: day.location?.name || day.location?.country,
            name: day.location?.name || day.location?.country,
            address: [day.location?.name, day.location?.country].filter(Boolean).join(', '),
            country: day.location?.country,
            startDate: day.date || trip.startDate,
            endDate: day.date || trip.endDate,
            tripId: trip._id,
            tripTitle: trip.title || trip.destination,
            visited: false,
          })),
      ];
    })).then((results) => {
      if (!isActive) return;
      setTripItineraryDays(Object.fromEntries(
        results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value)
      ));
    });

    return () => {
      isActive = false;
    };
  }, [trips]);

  // Fetch visited places with image enrichment
  useEffect(() => {
    let isActive = true;

    getVisitedPlaces()
      .then(async (response) => {
        if (!isActive) return;
        const loadedVisitedPlaces = response.data?.data?.visitedPlaces || [];
        setVisitedPlaces(loadedVisitedPlaces);

        if (!loadedVisitedPlaces.some((place) => !place.imageUrl && !place.imageUrls?.length)) return;

        try {
          const enrichmentResponse = await enrichVisitedPlaceImages();
          if (isActive) setVisitedPlaces(enrichmentResponse.data?.data?.visitedPlaces || loadedVisitedPlaces);
        } catch {
          // Existing records remain usable with the local fallback image.
        }
      })
      .catch(() => {
        if (isActive) setVisitedPlaces([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Fetch all trips data
  useEffect(() => {
    let isActive = true;

    deferStateUpdate(() => {
      if (isActive) setTripStatus('loading');
    });
    getTrips()
      .then((response) => {
        if (!isActive) return;
        setTrips(response.data?.data?.trips || []);
        setTripStatus('success');
      })
      .catch(() => {
        if (!isActive) return;
        setTrips([]);
        setTripStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Month navigation functions
  const moveMonth = (direction) => {
    setMonthDate((currentDate) => {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
      setSelectedDateKey(formatDateKey(nextMonth));
      return nextMonth;
    });
  };
  
  // Reset to today's date
  const selectToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(formatDateKey(today));
  };
  
  // Toggle report modal visibility
  const handleReportClick = (report) => {
    setActiveReport((currentReport) => (currentReport === report ? '' : report));
  };
  
  // Handle place action - filter by place title and type
  const handleVisitedPlaceAction = (place) => {
    setSearchTerm(place.title);
    setVisitedCategory(getTypeLabel(place.type));
    setActivePlaceMenu('');
  };
  
  // Return all state values and handlers for consumption by components
  return {
    activePlaceMenu,
    activeReport,
    calendarCells,
    clearDateRangeFilter,
    dashboardChartData,
    dateRangeFilter,
    error,
    favoritesCount: favorites.length,
    handleReportClick,
    hasDateRangeFilter,
    countryInsights,
    handleVisitedPlaceAction,
    maxMonthlyTripCount,
    monthDate,
    monthLabel,
    monthlyTripCounts,
    moveMonth,
    openCategoryMenu,
    placeRows,
    placeToVisitCount,
    recentActivity,
    searchTerm,
    selectToday,
    selectedDateKey,
    selectedDestinations,
    selectedVisits,
    setActivePlaceMenu,
    setDateRangeFilter: updateDateRangeFilter,
    setOpenCategoryMenu,
    setSearchTerm,
    setSelectedDateKey,
    setVisitedCategory,
    status,
    totalVisitCount,
    tripGroups,
    tripPlaceRows,
    tripsThisMonth,
    tripStatus,
    upcomingTrips,
    userStatistics,
    uniquePlaceCount,
    user,
    visitDonutSegments,
    visitedCategories,
    visitedCategory,
    visitedShare,
    visitedVsToVisitSegments,
    visitTypeRows,
  };
}
