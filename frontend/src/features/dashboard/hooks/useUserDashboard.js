/**
 * User dashboard hook.
 * Data loading, derived dashboard metrics, filters, and interaction state stay isolated from view components.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFavorites } from '../../../api/favoriteApi';
import { getTripItinerary } from '../../../api/itineraryApi';
import { getTrips, getTripSummary } from '../../../api/tripApi';
import { getVisitedCalendar, getVisitedPlaces } from '../../../api/visitedPlaceApi';
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

const chartColors = ['#0f9f89', '#2f6fed', '#f4a22c', '#9b6df3', '#0ea5b7', '#e05252'];

export function useUserDashboard() {
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [visitedCategory, setVisitedCategory] = useState('all');
  const [toVisitCategory, setToVisitCategory] = useState('all');
  const [openCategoryMenu, setOpenCategoryMenu] = useState('');
  const [activePlaceMenu, setActivePlaceMenu] = useState('');
  const [activeReport, setActiveReport] = useState('');
  const [days, setDays] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripItineraryDays, setTripItineraryDays] = useState({});
  const [weatherPreview, setWeatherPreview] = useState(null);
  const [tripStatus, setTripStatus] = useState('loading');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const dayLookup = useMemo(
    () => days.reduce((lookup, day) => ({ ...lookup, [day.date]: day.places || [] }), {}),
    [days]
  );
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
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

    return visitedPlaces.some((place) => {
      const placeTitle = normalizeVisitText(place.title);
      const placeAddress = normalizeVisitText(place.address);
      return place.type === 'location' && placeTitle === destinationTitle && (!destinationAddress || placeAddress === destinationAddress);
    });
  }, [visitedLookup, visitedPlaces]);
  const allTripDestinationRows = useMemo(() =>
    trips.flatMap((trip) =>
      getTripDestinationPlaces(trip).map((destination) => ({
        ...destination,
        visited: isDestinationVisited(destination),
      }))
    ), [isDestinationVisited, trips]);
  const tripDestinationLookup = useMemo(() => {
    const { start, end } = getMonthBounds(monthDate);
    return allTripDestinationRows.reduce((lookup, destination) => {
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
  }, [allTripDestinationRows, monthDate]);
  const calendarCells = useMemo(() => buildCalendarCells(monthDate, dayLookup, tripDestinationLookup), [dayLookup, monthDate, tripDestinationLookup]);
  const tripGroups = useMemo(() => getTripStatusGroups(trips), [trips]);
  const sortedUpcomingTrips = useMemo(
    () => [...tripGroups.active, ...tripGroups.upcoming].sort((firstTrip, secondTrip) => new Date(firstTrip.startDate) - new Date(secondTrip.startDate)),
    [tripGroups]
  );
  const nextTrip = sortedUpcomingTrips[0] || null;
  const selectedDestinations = useMemo(
    () => allTripDestinationRows.filter((destination) => isDateWithinRange(selectedDateKey, destination.startDate, destination.endDate)),
    [allTripDestinationRows, selectedDateKey]
  );
  const selectedVisits = dayLookup[selectedDateKey] || [];
  const visitedPlaceRows = useMemo(() => visitedPlaces.map((place) => ({
    ...place,
    totalVisits: getVisitCount(place),
    datedVisits: getDatedVisitCount(place),
    undatedVisits: (place.visits || [])
      .filter((visit) => !visit.visitedDate)
      .reduce((total, visit) => total + Number(visit.visitCount || 1), 0),
    latestVisitLabel: getLatestVisitLabel(place),
  })), [visitedPlaces]);
  const visitedCategories = useMemo(() => [
    'all',
    ...new Set(visitedPlaceRows.map((place) => getTypeLabel(place.type)).filter(Boolean)),
  ], [visitedPlaceRows]);
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
  const toVisitCategories = useMemo(() => {
    const tripNames = allTripDestinationRows.map((destination) => destination.tripTitle).filter(Boolean);
    return ['all', ...new Set(tripNames)];
  }, [allTripDestinationRows]);
  const tripPlaceRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const toVisitRows = allTripDestinationRows.filter((destination) =>
      !destination.visited && (toVisitCategory === 'all' || destination.tripTitle === toVisitCategory)
    );

    if (!normalizedSearch) return toVisitRows;

    return toVisitRows.filter((destination) =>
      [destination.title, destination.address, destination.country, destination.tripTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [allTripDestinationRows, searchTerm, toVisitCategory]);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const totalVisitCount = visitedPlaces.reduce((total, place) => total + getVisitCount(place), 0);
  const uniquePlaceCount = visitedPlaces.length;
  const placeToVisitCount = tripPlaceRows.length;
  const tripsThisMonth = trips.filter((trip) => {
    const { start, end } = getMonthBounds(monthDate);
    return new Date(trip.startDate) <= end && new Date(trip.endDate) >= start;
  }).length;
  const weatherTemperature = weatherPreview?.weather?.temperature?.max || weatherPreview?.weather?.temperature?.mean
    ? `${Math.round(weatherPreview.weather.temperature.max || weatherPreview.weather.temperature.mean)}${weatherPreview.weather.temperature.unit || 'C'}`
    : '';
  const recentActivity = useMemo(() => [
    ...placeRows.slice(0, 2).map((place) => ({
      id: `visited-${place._id || place.placeKey}`,
      type: 'visited',
      tone: 'green',
      title: `Visited ${place.title}`,
      meta: place.latestVisitLabel,
    })),
    ...tripPlaceRows.slice(0, 1).map((place) => ({
      id: `to-visit-${place.tripId}-${place.title}`,
      type: 'to-visit',
      tone: 'blue',
      title: `Added ${place.title} to places to visit`,
      meta: place.tripTitle,
    })),
    ...sortedUpcomingTrips.slice(0, 1).map((trip) => ({
      id: `trip-${trip._id}`,
      type: 'trip',
      tone: 'purple',
      title: `Created trip ${trip.title || trip.destination}`,
      meta: formatDateRange(trip.startDate, trip.endDate),
    })),
  ], [placeRows, sortedUpcomingTrips, tripPlaceRows]);
  const visitTypeRows = useMemo(() => {
    const typeCounts = visitedPlaces.reduce((counts, place) => {
      const type = getTypeLabel(place.type);
      return { ...counts, [type]: (counts[type] || 0) + getVisitCount(place) };
    }, {});

    return Object.entries(typeCounts)
      .map(([label, value], index) => ({ label, value, color: chartColors[index % chartColors.length] }))
      .sort((firstRow, secondRow) => secondRow.value - firstRow.value)
      .slice(0, 4);
  }, [visitedPlaces]);
  const visitDonutSegments = useMemo(() => getDonutSegments(visitTypeRows), [visitTypeRows]);
  const visitedVsToVisitSegments = useMemo(() => getDonutSegments([
    { label: 'Visited', value: uniquePlaceCount, color: '#0f9f89' },
    { label: 'To Visit', value: placeToVisitCount, color: '#9b6df3' },
  ]), [placeToVisitCount, uniquePlaceCount]);
  const visitedShare = uniquePlaceCount + placeToVisitCount
    ? Math.round((uniquePlaceCount / (uniquePlaceCount + placeToVisitCount)) * 100)
    : 0;
  const countryInsights = useMemo(() => {
    const visitedCountryRows = buildCountryRows([
      ...visitedPlaces.map((place) => getPlaceCountry(place)),
      ...allTripDestinationRows.filter((destination) => destination.visited).map((destination) => destination.country),
    ]);
    const itineraryDestinationRows = Object.values(tripItineraryDays).flat();
    const nextCountryRows = buildCountryRows(
      [...allTripDestinationRows, ...itineraryDestinationRows]
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
  }, [allTripDestinationRows, tripItineraryDays, visitedPlaces]);
  const monthlyTripCounts = useMemo(() => {
    const year = monthDate.getFullYear();
    return Array.from({ length: 12 }, (_, index) => {
      const monthStart = new Date(year, index, 1);
      const monthEnd = new Date(year, index + 1, 0);
      return trips.filter((trip) => new Date(trip.startDate) <= monthEnd && new Date(trip.endDate) >= monthStart).length;
    });
  }, [monthDate, trips]);
  const maxMonthlyTripCount = Math.max(...monthlyTripCounts, 1);

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

  useEffect(() => {
    let isActive = true;

    getVisitedPlaces()
      .then((response) => {
        if (!isActive) return;
        setVisitedPlaces(response.data?.data?.visitedPlaces || []);
      })
      .catch(() => {
        if (isActive) setVisitedPlaces([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

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

  useEffect(() => {
    let isActive = true;

    if (!nextTrip?._id) {
      deferStateUpdate(() => {
        if (isActive) setWeatherPreview(null);
      });
      return () => {
        isActive = false;
      };
    }

    getTripSummary(nextTrip._id)
      .then((response) => {
        if (!isActive) return;
        setWeatherPreview(response.data?.data || null);
      })
      .catch(() => {
        if (isActive) setWeatherPreview(null);
      });

    return () => {
      isActive = false;
    };
  }, [nextTrip?._id]);

  const moveMonth = (direction) => {
    setMonthDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };
  const selectToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(formatDateKey(today));
  };
  const handleReportClick = (report) => {
    setActiveReport((currentReport) => (currentReport === report ? '' : report));
  };
  const handleVisitedPlaceAction = (place) => {
    setSearchTerm(place.title);
    setVisitedCategory(getTypeLabel(place.type));
    setActivePlaceMenu('');
  };
  const handleDestinationAction = (destination) => {
    setSearchTerm(destination.title);
    setToVisitCategory(destination.tripTitle || 'all');
    setActivePlaceMenu('');
  };

  return {
    activePlaceMenu,
    activeReport,
    calendarCells,
    error,
    favoritesCount: favorites.length,
    handleDestinationAction,
    handleReportClick,
    countryInsights,
    handleVisitedPlaceAction,
    maxMonthlyTripCount,
    monthDate,
    monthLabel,
    monthlyTripCounts,
    moveMonth,
    nextTrip,
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
    setOpenCategoryMenu,
    setSearchTerm,
    setSelectedDateKey,
    setToVisitCategory,
    setVisitedCategory,
    status,
    toVisitCategories,
    toVisitCategory,
    totalVisitCount,
    tripGroups,
    tripPlaceRows,
    tripsThisMonth,
    tripStatus,
    uniquePlaceCount,
    user,
    visitDonutSegments,
    visitedCategories,
    visitedCategory,
    visitedShare,
    visitedVsToVisitSegments,
    visitTypeRows,
    weatherPreview,
    weatherTemperature,
  };
}
