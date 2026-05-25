import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudSun,
  DollarSign,
  Image,
  Landmark,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Star,
  StickyNote,
  TrainFront,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react';
import {
  createItineraryItem,
  deleteItineraryItem,
  getTripItinerary,
  updateItineraryDay,
  updateItineraryItem,
} from '../../api/itineraryApi';
import { getTripSummary } from '../../api/tripApi';
import { getMapPlaceDetails, searchMapCategoryPlaces } from '../../api/mapApi';
import TripMapPreview from '../../components/trips/TripMapPreview';
import { getTripMapPoint } from '../../components/trips/tripMapUtils';
import CurrencyContext from '../../context/currencyContext';
import './TripDetailsPage.css';

const ideaCategories = [
  { id: 'attractions', label: 'Attractions', icon: Landmark },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels', icon: BedDouble },
  { id: 'train', label: 'Transport', icon: TrainFront },
  { id: 'shopping', label: 'Shopping', icon: Lightbulb },
];

const itineraryGroups = [
  { id: 'food', title: 'What to eat', addLabel: 'Food', categoryId: 'food', types: ['restaurant'], icon: Utensils },
  { id: 'see', title: 'What to see and do', addLabel: 'Attractions', categoryId: 'attractions', types: ['attraction', 'custom'], icon: Landmark },
  { id: 'stay', title: 'Where to stay', addLabel: 'Stay', categoryId: 'hotels', types: ['hotel'], icon: BedDouble },
  { id: 'move', title: 'How to get there', addLabel: 'Transportation', categoryId: 'train', types: ['transport', 'flight'], icon: TrainFront },
];

const getFallbackIdeas = (category, trip) => {
  const destination = trip?.destination || 'this destination';
  const country = trip?.country ? `, ${trip.country}` : '';
  const templates = {
    attractions: ['Historic district walk', 'Local museum visit', 'Scenic viewpoint', 'Cultural landmark'],
    food: ['Local breakfast spot', 'Street food area', 'Dinner near hotel', 'Cafe break'],
    hotels: ['Central stay option', 'Transit-friendly hotel', 'Quiet neighborhood stay', 'Budget-friendly stay'],
    train: ['Nearest train station', 'Airport transfer option', 'Main transit hub', 'Local transport stop'],
    shopping: ['Local market', 'Souvenir street', 'Design store area', 'Evening mall stop'],
  };

  return (templates[category] || templates.attractions).map((name, index) => ({
    id: `fallback-${category}-${index}`,
    name,
    displayName: `${name} near ${destination}${country}`,
    summary: 'Planning placeholder. Replace with a confirmed place from map search later.',
    lat: null,
    lng: null,
    type: 'idea',
    fallback: true,
  }));
};

const getPlaceAddress = (place) => place.address || place.displayName || 'Location details unavailable';

const formatIdeaPlace = (place, categoryId) => ({
  ...place,
  lat: Number(place.lat ?? place.coordinates?.latitude),
  lng: Number(place.lng ?? place.coordinates?.longitude),
  categoryId,
  address: getPlaceAddress(place),
  imageUrl: place.imageUrl || place.imageUrls?.[0] || '',
  imageUrls: place.imageUrls || (place.imageUrl ? [place.imageUrl] : []),
  hours: place.hours || place.hoursSummary || place.openState || 'Hours unavailable',
  rating: place.rating || 'N/A',
  reviews: place.reviews || place.reviewCount || '',
  price: place.price || place.priceDetail?.display || 'Price unavailable',
  openState: place.openState || '',
  summary: place.summary || place.category || 'Place result from map data.',
  type: 'idea',
});

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'No date');

const formatInputDate = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const getItemsForDay = (items, day) =>
  items.filter((item) => formatInputDate(item.scheduledDate) === formatInputDate(day.date));

const getIdeaItemType = (category) => {
  if (category === 'food') return 'restaurant';
  if (category === 'hotels') return 'hotel';
  return 'attraction';
};

function TripDetailsPage() {
  const { id } = useParams();
  const currency = useContext(CurrencyContext);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeDayNumber, setActiveDayNumber] = useState(1);
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [weather, setWeather] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [ideaCategory, setIdeaCategory] = useState('attractions');
  const [status, setStatus] = useState('loading');
  const [ideaStatus, setIdeaStatus] = useState('idle');
  const [ideaDetailStatus, setIdeaDetailStatus] = useState('idle');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [ideaSearch, setIdeaSearch] = useState('');
  const [addMode, setAddMode] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([getTripItinerary(id), getTripSummary(id)])
      .then(([itineraryResponse, summaryResponse]) => {
        if (!isMounted) return;
        const itinerary = itineraryResponse.data?.data || {};
        setTrip(itinerary.trip);
        setDays(itinerary.days || []);
        setItems(itinerary.items || []);
        setWeather(summaryResponse.data?.data?.weather || null);
        setStatus('success');
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unable to load trip details.');
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const activeDay = useMemo(
    () => days.find((day) => day.dayNumber === activeDayNumber) || days[0],
    [activeDayNumber, days]
  );

  const activeDayItems = useMemo(() => getItemsForDay(items, activeDay || {}), [activeDay, items]);
  const groupedDayItems = useMemo(() => itineraryGroups.map((group) => ({
    ...group,
    items: activeDayItems.filter((item) => group.types.includes(item.type)),
  })), [activeDayItems]);
  const plannedBudget = days.reduce((total, day) => total + Number(day.budget?.amount || 0), 0);
  const itemSpend = items.reduce((total, item) => total + Number(item.priceEstimate?.amount || 0), 0);
  const tripCurrency = trip?.budget?.currency || currency?.selectedCurrency || 'MYR';
  const activeDayBudget = Number(activeDay?.budget?.amount || 0);
  const activeDaySpend = activeDayItems.reduce((total, item) => total + Number(item.priceEstimate?.amount || 0), 0);
  const totalBudget = Number(trip?.budget?.totalAmount || 0);
  const remainingBudget = Math.max(0, totalBudget - plannedBudget);
  const plannedBudgetPercent = totalBudget ? Math.min(100, Math.round((plannedBudget / totalBudget) * 100)) : 0;
  const activeDaySpendPercent = activeDayBudget ? Math.min(100, Math.round((activeDaySpend / activeDayBudget) * 100)) : 0;
  const AddModeIcon = addMode?.icon || Plus;
  const weatherTemperature = weather?.temperature?.max || weather?.temperature?.mean
    ? `${Math.round(weather.temperature.max || weather.temperature.mean)}${weather.temperature.unit || 'C'}`
    : '';
  const destinationPlaces = trip?.destinationSegments?.length
    ? trip.destinationSegments
    : trip
      ? [{ city: trip.destination, country: trip.country }]
      : [];
  const mapPlaces = [
    ...destinationPlaces,
    ...items.map((item) => ({
      title: item.title,
      city: item.location?.address,
      lat: item.location?.coordinates?.coordinates?.[1],
      lng: item.location?.coordinates?.coordinates?.[0],
    })),
  ];
  const ideaMapPlaces = selectedIdea ? [selectedIdea, ...ideas.filter((idea) => idea.id !== selectedIdea.id)] : ideas;

  const updateDayLocal = (dayNumber, patch) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.dayNumber === dayNumber ? { ...day, ...patch } : day))
    );
  };

  const saveDay = async (day) => {
    const response = await updateItineraryDay(id, day.dayNumber, {
      date: day.date,
      title: day.title,
      notes: day.notes,
      budget: day.budget,
    });
    const savedDay = response.data?.data?.day;
    if (savedDay) updateDayLocal(savedDay.dayNumber, savedDay);
  };

  const updateItemNotesLocal = (item, description) => {
    setItems((currentItems) =>
      currentItems.map((currentItem) => (currentItem._id === item._id ? { ...currentItem, description } : currentItem))
    );
  };

  const saveItemNotes = async (itemId) => {
    const item = items.find((currentItem) => currentItem._id === itemId);
    await updateItineraryItem(itemId, { description: item?.description || '' });
  };

  const updateItemPriceLocal = (item, amount) => {
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem._id === item._id
          ? { ...currentItem, priceEstimate: { amount: Number(amount) || 0, currency: tripCurrency } }
          : currentItem
      )
    );
  };

  const saveItemPrice = async (itemId) => {
    const item = items.find((currentItem) => currentItem._id === itemId);
    await updateItineraryItem(itemId, {
      priceEstimate: {
        amount: Number(item?.priceEstimate?.amount || 0),
        currency: item?.priceEstimate?.currency || tripCurrency,
      },
    });
  };

  const removeItem = async (itemId) => {
    await deleteItineraryItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item._id !== itemId));
  };

  const loadIdeas = async (category = ideaCategory, searchTerm = ideaSearch) => {
    if (!trip) return;
    setIdeaStatus('loading');
    setIdeaCategory(category);
    setSelectedIdea(null);

    try {
      const firstPoint = getTripMapPoint(destinationPlaces[0] || {});
      const results = await searchMapCategoryPlaces(category, firstPoint, {
        destination: searchTerm?.trim() || trip.destination,
        limit: 12,
      });
      const nextIdeas = results.map((idea) => formatIdeaPlace(idea, category));
      const fallbackIdeas = getFallbackIdeas(category, trip);
      const resolvedIdeas = nextIdeas.length ? nextIdeas : fallbackIdeas;
      setIdeas(resolvedIdeas);
      setSelectedIdea(resolvedIdeas[0] || null);
      setIdeaStatus('success');
    } catch {
      const fallbackIdeas = getFallbackIdeas(category, trip);
      setIdeas(fallbackIdeas);
      setSelectedIdea(fallbackIdeas[0] || null);
      setIdeaStatus('fallback');
    }
  };

  const openAddSearch = (group) => {
    setAddMode(group);
    setIdeaSearch('');
    loadIdeas(group.categoryId, '');
  };

  const closeAddSearch = () => {
    setAddMode(null);
    setSelectedIdea(null);
  };

  const handleIdeaSearch = (event) => {
    event.preventDefault();
    loadIdeas(addMode?.categoryId || ideaCategory, ideaSearch);
  };

  const selectIdea = async (idea) => {
    setSelectedIdea(idea);

    if (idea.fallback || !Number.isFinite(Number(idea.lat)) || !Number.isFinite(Number(idea.lng))) {
      return;
    }

    setIdeaDetailStatus('loading');
    try {
      const response = await getMapPlaceDetails(idea);
      if (response.available && response.item) {
        setSelectedIdea((currentIdea) => (
          currentIdea?.id === idea.id
            ? { ...currentIdea, ...formatIdeaPlace(response.item, currentIdea.categoryId || ideaCategory), id: currentIdea.id }
            : currentIdea
        ));
      }
      setIdeaDetailStatus('success');
    } catch {
      setIdeaDetailStatus('error');
    }
  };

  const addIdeaToDay = async (idea) => {
    const hasCoordinates = Number.isFinite(Number(idea.lng)) && Number.isFinite(Number(idea.lat));
    const response = await createItineraryItem(id, {
      type: addMode?.types?.[0] || getIdeaItemType(idea.categoryId || ideaCategory),
      title: idea.name,
      description: idea.summary || idea.address || idea.displayName || '',
      scheduledDate: activeDay?.date || trip.startDate,
      location: hasCoordinates ? {
        address: idea.address || idea.displayName,
        coordinates: {
          type: 'Point',
          coordinates: [Number(idea.lng), Number(idea.lat)],
        },
      } : undefined,
      source: 'openstreetmap',
      externalId: idea.id,
      priceEstimate: { amount: 0, currency: tripCurrency },
    });
    setItems((currentItems) => [...currentItems, response.data.data.item]);
  };

  if (status === 'loading') {
    return <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading trip details...</p>;
  }

  if (status === 'error') {
    return <p className="form-error" role="alert">{message}</p>;
  }

  return (
    <section className="trip-details-page" aria-labelledby="trip-details-title">
      <header className="trip-details-topbar">
        <div>
          <Link to="/trips" className="trip-back-link">Trips</Link>
          <h2 id="trip-details-title">{trip.title || trip.destination}</h2>
          <p>
            <CalendarDays size={15} aria-hidden="true" />
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            <span>{trip.dateFlexibility?.mode === 'flexible' ? `Flexible by ${trip.dateFlexibility.windowDays} days` : 'Exact dates'}</span>
          </p>
        </div>
        <div className="trip-details-budget">
          <span>Whole trip budget</span>
          <strong>{currency?.formatAmount ? currency.formatAmount(trip.budget?.totalAmount || 0, tripCurrency) : `${tripCurrency} ${trip.budget?.totalAmount || 0}`}</strong>
        </div>
      </header>

      <div className="trip-details-shell">
        <aside className="trip-details-panel">
          {addMode ? (
            <div className="trip-add-search-panel">
              <header className="trip-add-search-header">
                <button type="button" onClick={closeAddSearch} aria-label="Back to itinerary">
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <div>
                  <span>Add to Day {activeDay?.dayNumber || 1}</span>
                  <strong>{addMode.title}</strong>
                </div>
              </header>

              <form className="trip-idea-search" onSubmit={handleIdeaSearch}>
                <input
                  value={ideaSearch}
                  onChange={(event) => setIdeaSearch(event.target.value)}
                  placeholder={`Search ${addMode.addLabel.toLowerCase()} near ${trip.destination || 'this trip'}`}
                />
                <button type="submit" aria-label="Search places">
                  <Search size={16} aria-hidden="true" />
                </button>
              </form>

              <div className="trip-add-search-tabs" aria-label="Search shortcuts">
                <button className="active" type="button" onClick={() => loadIdeas(addMode.categoryId, '')}>
                  Recommend
                </button>
                {destinationPlaces.slice(0, 4).map((place) => (
                  <button
                    type="button"
                    key={`${place.city}-${place.country}`}
                    onClick={() => {
                      setIdeaSearch(place.city || '');
                      loadIdeas(addMode.categoryId, place.city || '');
                    }}
                  >
                    {place.city || place.country}
                  </button>
                ))}
              </div>

              {ideaStatus === 'loading' ? (
                <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading places...</p>
              ) : (
                <div className="trip-idea-list">
                  {ideas.map((idea) => (
                    <button
                      className={selectedIdea?.id === idea.id ? 'trip-idea-result is-active' : 'trip-idea-result'}
                      key={idea.id}
                      type="button"
                      onClick={() => selectIdea(idea)}
                    >
                      <div className="trip-idea-card-main">
                        <span className="trip-idea-thumb">
                          {idea.imageUrl ? <img src={idea.imageUrl} alt="" /> : <AddModeIcon size={20} aria-hidden="true" />}
                        </span>
                        <div>
                          <span className="trip-idea-type">{addMode.addLabel}</span>
                          <strong>{idea.name}</strong>
                          <p>{idea.address || idea.displayName || idea.summary || 'Suggested place near this trip.'}</p>
                        </div>
                      </div>
                      <div className="trip-idea-meta">
                        <span><Star size={12} aria-hidden="true" />{idea.rating && idea.rating !== 'N/A' ? `${Number(idea.rating).toFixed(1)} rating` : 'No rating yet'}</span>
                        {idea.reviews ? <span>{Number(idea.reviews) ? `${Number(idea.reviews).toLocaleString()} reviews` : idea.reviews}</span> : null}
                        <span><Clock3 size={12} aria-hidden="true" />{idea.openState || idea.hours || 'Hours unavailable'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <nav className="trip-details-tabs" aria-label="Trip details tabs">
                <button className={activeTab === 'itinerary' ? 'active' : ''} type="button" onClick={() => setActiveTab('itinerary')}>
                  Itinerary
                </button>
                <button className={activeTab === 'ideas' ? 'active' : ''} type="button" onClick={() => {
                  setActiveTab('ideas');
                  if (ideas.length === 0) loadIdeas();
                }}>
                  Ideas
                </button>
              </nav>

              <div className="trip-day-tabs" aria-label="Itinerary days">
                {days.map((day) => (
                  <button
                    className={activeDayNumber === day.dayNumber ? 'active' : ''}
                    type="button"
                    key={day.dayNumber}
                    onClick={() => setActiveDayNumber(day.dayNumber)}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>

              {activeTab === 'itinerary' ? (
              <div className="trip-itinerary-workspace">
              <section className="trip-budget-overview" aria-label="Budget overview">
                <div>
                  <span>Daily budget</span>
                  <strong>{currency?.formatAmount ? currency.formatAmount(activeDayBudget, tripCurrency) : `${tripCurrency} ${activeDayBudget}`}</strong>
                  <small>{currency?.formatAmount ? currency.formatAmount(activeDaySpend, tripCurrency) : activeDaySpend} estimated in items</small>
                  <span className="trip-budget-bar"><em style={{ width: `${activeDaySpendPercent}%` }} /></span>
                </div>
                <div>
                  <span>Trip allocation</span>
                  <strong>{plannedBudgetPercent}% planned</strong>
                  <small>{currency?.formatAmount ? currency.formatAmount(remainingBudget, tripCurrency) : remainingBudget} left unassigned</small>
                  <span className="trip-budget-bar"><em style={{ width: `${plannedBudgetPercent}%` }} /></span>
                </div>
                <div>
                  <span>Weather</span>
                  <strong>{weather?.available ? `${weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}` : 'Unavailable'}</strong>
                  <small>{weather?.available ? weather.travelTip || 'Use this when choosing outdoor ideas.' : weather?.message || 'Weather service is temporarily unavailable.'}</small>
                </div>
              </section>

              {activeDay && (
                <section className="trip-day-editor">
                  <div className="trip-day-heading">
                    <div>
                      <span>{formatDate(activeDay.date)}</span>
                      <input
                        value={activeDay.title || `Day ${activeDay.dayNumber}`}
                        onChange={(event) => updateDayLocal(activeDay.dayNumber, { title: event.target.value })}
                        onBlur={() => saveDay(activeDay)}
                      />
                    </div>
                    <label>
                      <WalletCards size={15} aria-hidden="true" />
                      <input
                        type="number"
                        min="0"
                        value={activeDay.budget?.amount || 0}
                        onChange={(event) => updateDayLocal(activeDay.dayNumber, {
                          budget: { amount: Number(event.target.value), currency: tripCurrency },
                        })}
                        onBlur={() => saveDay(activeDay)}
                      />
                    </label>
                  </div>

                  <label className="trip-day-note">
                    <span><StickyNote size={15} aria-hidden="true" /> Day notes</span>
                    <textarea
                      value={activeDay.notes || ''}
                      onChange={(event) => updateDayLocal(activeDay.dayNumber, { notes: event.target.value })}
                      onBlur={() => saveDay(activeDay)}
                      placeholder="Add reminders, backup plans, or travel notes for this day."
                    />
                  </label>
                </section>
              )}

              <div className="trip-itinerary-groups">
                {groupedDayItems.map((group) => {
                  const GroupIcon = group.icon;

                  return (
                    <section className="trip-itinerary-group" key={group.id}>
                      <div className="trip-group-heading">
                        <span><GroupIcon size={16} aria-hidden="true" /></span>
                        <div>
                          <h3>{group.title}</h3>
                          <small>{group.items.length} item{group.items.length === 1 ? '' : 's'}</small>
                        </div>
                      </div>

                      <button className="trip-group-add" type="button" onClick={() => openAddSearch(group)}>
                        <Plus size={15} aria-hidden="true" />
                        Add {group.addLabel}
                      </button>

                      {group.items.map((item) => (
                        <article className="trip-itinerary-item" key={item._id}>
                          <div className="trip-item-title-row">
                            <span>
                              <MapPin size={16} aria-hidden="true" />
                              <strong>{item.title}</strong>
                            </span>
                            <button type="button" onClick={() => removeItem(item._id)} aria-label={`Remove ${item.title}`}>
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                          <textarea
                            value={item.description || ''}
                            onChange={(event) => updateItemNotesLocal(item, event.target.value)}
                            onBlur={() => saveItemNotes(item._id)}
                            placeholder="Place notes, booking reference, opening hours, or reminders."
                          />
                          <label className="trip-item-cost">
                            <span><DollarSign size={13} aria-hidden="true" /> Estimated cost</span>
                            <input
                              type="number"
                              min="0"
                              value={item.priceEstimate?.amount || 0}
                              onChange={(event) => updateItemPriceLocal(item, event.target.value)}
                              onBlur={() => saveItemPrice(item._id)}
                            />
                            <small>{tripCurrency}</small>
                          </label>
                        </article>
                      ))}
                    </section>
                  );
                })}
              </div>
            </div>
              ) : (
            <div className="trip-ideas-workspace">
              <form className="trip-idea-search" onSubmit={handleIdeaSearch}>
                <input
                  value={ideaSearch}
                  onChange={(event) => setIdeaSearch(event.target.value)}
                  placeholder={`Search ${trip.destination || 'this destination'}`}
                />
                <button type="submit" aria-label="Search places">
                  <Search size={16} aria-hidden="true" />
                </button>
              </form>

              <div className="trip-idea-filters" aria-label="Idea categories">
                {ideaCategories.map((category) => {
                  const CategoryIcon = category.icon;

                  return (
                    <button
                      className={ideaCategory === category.id ? 'active' : ''}
                      type="button"
                      key={category.id}
                      onClick={() => loadIdeas(category.id, ideaSearch)}
                    >
                      <CategoryIcon size={15} aria-hidden="true" />
                      {category.label}
                    </button>
                  );
                })}
              </div>

              {ideaStatus === 'loading' ? (
                <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading ideas...</p>
              ) : ideas.length === 0 ? (
                <p className="settings-empty">Choose a category to load map-based ideas for this trip.</p>
              ) : (
                <div className="trip-idea-list">
                  {ideas.map((idea) => (
                    <button
                      className={selectedIdea?.id === idea.id ? 'trip-idea-result is-active' : 'trip-idea-result'}
                      key={idea.id}
                      type="button"
                      onClick={() => selectIdea(idea)}
                    >
                      <div className="trip-idea-card-main">
                        <span className="trip-idea-thumb">
                          {idea.imageUrl ? <img src={idea.imageUrl} alt="" /> : <Lightbulb size={20} aria-hidden="true" />}
                        </span>
                        <div>
                          <span className="trip-idea-type">{ideaCategory}</span>
                          <strong>{idea.name}</strong>
                          <p>{idea.address || idea.displayName || idea.summary || 'Suggested place near this trip.'}</p>
                        </div>
                      </div>
                      <div className="trip-idea-meta">
                        <span><Star size={12} aria-hidden="true" />{idea.rating && idea.rating !== 'N/A' ? `${Number(idea.rating).toFixed(1)} rating` : 'No rating yet'}</span>
                        {idea.reviews ? <span>{Number(idea.reviews) ? `${Number(idea.reviews).toLocaleString()} reviews` : idea.reviews}</span> : null}
                        <span><Clock3 size={12} aria-hidden="true" />{idea.openState || idea.hours || 'Hours unavailable'}</span>
                        <span><DollarSign size={12} aria-hidden="true" />{idea.price || 'Price unavailable'}</span>
                        {idea.fallback && <span>Planning placeholder</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
              )}

              <div className="trip-assistant-bar">
                <Sparkles size={16} aria-hidden="true" />
                Ask anything about this trip
              </div>
            </>
          )}
        </aside>

        <main className="trip-details-map-area">
          <div className="trip-details-map-toolbar">
            {ideaCategories.map((category) => {
              const CategoryIcon = category.icon;

              return (
                <button type="button" key={category.id} onClick={() => {
                  setActiveTab('ideas');
                  loadIdeas(category.id, ideaSearch);
                }}>
                  <CategoryIcon size={15} aria-hidden="true" />
                  {category.label}
                </button>
              );
            })}
          </div>
          <TripMapPreview className="trip-details-map" places={(addMode || activeTab === 'ideas') && ideaMapPlaces.length ? ideaMapPlaces : mapPlaces} zoom={(addMode || activeTab === 'ideas') ? 8 : undefined} />
          {(addMode || activeTab === 'ideas') && selectedIdea ? (
            <aside className="trip-place-detail-panel" aria-label={`${selectedIdea.name} details`}>
              <button className="trip-place-detail-close" type="button" onClick={() => setSelectedIdea(null)} aria-label="Close place details">
                <X size={18} aria-hidden="true" />
              </button>
              {selectedIdea.imageUrl ? (
                <img className="trip-place-detail-image" src={selectedIdea.imageUrl} alt="" loading="lazy" />
              ) : (
                <div className="trip-place-detail-image trip-place-detail-empty">
                  <Image size={26} aria-hidden="true" />
                </div>
              )}
              <div className="trip-place-detail-body">
                <span className="trip-idea-type">{selectedIdea.categoryId || ideaCategory}</span>
                <h3>{selectedIdea.name}</h3>
                {ideaDetailStatus === 'loading' ? (
                  <p className="trip-place-loading"><LoaderCircle className="trip-details-spin" size={14} aria-hidden="true" /> Loading richer place details...</p>
                ) : null}
                <div className="trip-place-rating">
                  <Star size={15} aria-hidden="true" />
                  <strong>{selectedIdea.rating && selectedIdea.rating !== 'N/A' ? `${Number(selectedIdea.rating).toFixed(1)} stars` : 'No rating'}</strong>
                  {selectedIdea.reviews ? <span>{Number(selectedIdea.reviews) ? `${Number(selectedIdea.reviews).toLocaleString()} reviews` : selectedIdea.reviews}</span> : null}
                </div>
                <p>{selectedIdea.summary || selectedIdea.address || selectedIdea.displayName || 'Map place result for this trip.'}</p>
                <dl className="trip-place-facts">
                  <div>
                    <dt><Clock3 size={14} aria-hidden="true" /> Hours</dt>
                    <dd>{selectedIdea.openState || selectedIdea.hours || 'Hours unavailable'}</dd>
                  </div>
                  <div>
                    <dt><DollarSign size={14} aria-hidden="true" /> Price</dt>
                    <dd>{selectedIdea.price || 'Price unavailable'}</dd>
                  </div>
                  <div>
                    <dt><MapPin size={14} aria-hidden="true" /> Address</dt>
                    <dd>{selectedIdea.address || selectedIdea.displayName || 'Address unavailable'}</dd>
                  </div>
                </dl>
              </div>
              <div className="trip-place-actions">
                <button type="button" onClick={() => addIdeaToDay(selectedIdea)}>
                  <Plus size={16} aria-hidden="true" />
                  Add to Day {activeDay?.dayNumber || 1}
                </button>
              </div>
            </aside>
          ) : null}
          <div className="trip-details-summary-strip">
            <span><CloudSun size={16} aria-hidden="true" />{weather?.available ? weather.condition : weather?.message || 'Weather unavailable'}</span>
            <span><WalletCards size={16} aria-hidden="true" />Daily planned: {currency?.formatAmount ? currency.formatAmount(plannedBudget, tripCurrency) : plannedBudget}</span>
            <span><CheckCircle2 size={16} aria-hidden="true" />Item estimates: {currency?.formatAmount ? currency.formatAmount(itemSpend, tripCurrency) : itemSpend}</span>
          </div>
        </main>
      </div>
    </section>
  );
}

export default TripDetailsPage;
