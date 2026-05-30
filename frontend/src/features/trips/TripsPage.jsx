import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  ListChecks,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { createTrip, getTrips } from '../../api/tripApi';
import { createPackingList } from '../../api/travelToolsApi';
import TripMapPreview from '../../components/trips/TripMapPreview';
import CurrencyContext from '../../context/currencyContext';
import './TripsPage.css';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const documentOptions = ['Passport', 'Visa', 'Flight ticket', 'Hotel booking', 'Insurance'];
const styleOptions = ['Food', 'Culture', 'Nature', 'Shopping', 'Relaxing'];
const flexibleDayOptions = [1, 2, 3, 4, 5, 6, 7];

const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + index);

  return {
    value: date.toISOString().slice(0, 7),
    label: date.toLocaleDateString(undefined, { month: 'long' }),
    year: date.getFullYear(),
  };
});

const getFlexibleDateRange = (monthValue, days) => {
  const [year, month] = String(monthValue || today.slice(0, 7)).split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, Number(days) || 1) - 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const createEmptySegment = (order = 1, startDate = today, endDate = tomorrow) => ({
  city: '',
  country: '',
  countryCode: '',
  startDate,
  endDate,
  order,
});

const normalizeTripList = (response) => response.data?.data?.trips || [];

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Dates not set';
  return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
};

const getDurationDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
};

function TripsPage() {
  const navigate = useNavigate();
  const currency = useContext(CurrencyContext);
  const activeCurrencyCode = currency?.activeCurrency?.code || currency?.selectedCurrency || 'MYR';
  const [countries, setCountries] = useState([]);
  const [stateOptionsByCountry, setStateOptionsByCountry] = useState({});
  const [createMode, setCreateMode] = useState('self');
  const [activeView, setActiveView] = useState('create');
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    startDate: today,
    endDate: tomorrow,
    dateMode: 'exact',
    flexibleWindowDays: 3,
    flexibleMonth: today.slice(0, 7),
    budgetAmount: '',
    aiPrompt: '',
    styles: [],
    createPackingList: true,
    createDocumentChecklist: true,
    documentTypes: ['Passport', 'Flight ticket', 'Hotel booking'],
    destinationSegments: [createEmptySegment()],
  });

  useEffect(() => {
    let isMounted = true;

    getTrips()
      .then((response) => {
        if (!isMounted) return;
        setTrips(normalizeTripList(response));
        setStatus('success');
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unable to load trips.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return trips.slice(0, 6);

    return trips.filter((trip) =>
      [trip.title, trip.destination, trip.country]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [searchQuery, trips]);

  const previewSegments = form.destinationSegments.filter((segment) => segment.city.trim());
  const totalBudget = Number(form.budgetAmount || 0);
  const primarySegment = form.destinationSegments[0];
  const flexibleMonthOptions = useMemo(() => getMonthOptions(), []);
  const displayedDateRange = form.dateMode === 'flexible'
    ? getFlexibleDateRange(form.flexibleMonth, form.flexibleWindowDays)
    : { startDate: form.startDate, endDate: form.endDate };
  const durationDays = getDurationDays(displayedDateRange.startDate, displayedDateRange.endDate);

  useEffect(() => {
    let isMounted = true;

    import('country-state-city')
      .then(({ Country }) => {
        if (isMounted) setCountries(Country.getAllCountries());
      })
      .catch(() => {
        if (isMounted) setCountries([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!primarySegment?.countryCode) {
      return;
    }

    let isMounted = true;

    import('country-state-city')
      .then(({ State }) => {
        if (isMounted) {
          setStateOptionsByCountry((current) => ({
            ...current,
            [primarySegment.countryCode]: State.getStatesOfCountry(primarySegment.countryCode),
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [primarySegment?.countryCode]);

  const updateField = (field, value) => {
    setFormError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateSegment = (index, field, value) => {
    setFormError('');
    setForm((current) => ({
      ...current,
      destinationSegments: current.destinationSegments.map((segment, segmentIndex) =>
        segmentIndex === index ? { ...segment, [field]: value } : segment
      ),
    }));
  };

  const updateSegmentCountry = (index, countryCode) => {
    const country = countries.find((item) => item.isoCode === countryCode);
    setFormError('');
    if (countryCode && !stateOptionsByCountry[countryCode]) {
      import('country-state-city')
        .then(({ State }) => {
          setStateOptionsByCountry((current) => ({
            ...current,
            [countryCode]: State.getStatesOfCountry(countryCode),
          }));
        })
        .catch(() => {});
    }
    setForm((current) => ({
      ...current,
      destinationSegments: current.destinationSegments.map((segment, segmentIndex) =>
        segmentIndex === index
          ? { ...segment, countryCode, country: country?.name || '', city: '' }
          : segment
      ),
    }));
  };

  const toggleArrayValue = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const addSegment = () => {
    setForm((current) => ({
      ...current,
      destinationSegments: [
        ...current.destinationSegments,
        createEmptySegment(current.destinationSegments.length + 1, current.startDate, current.endDate),
      ],
    }));
  };

  const removeSegment = (index) => {
    setForm((current) => ({
      ...current,
      destinationSegments: current.destinationSegments
        .filter((_, segmentIndex) => segmentIndex !== index)
        .map((segment, segmentIndex) => ({ ...segment, order: segmentIndex + 1 })),
    }));
  };

  const validateForm = () => {
    const segments = form.destinationSegments.filter((segment) => segment.city.trim());

    if (!form.title.trim()) return 'Trip title is required.';
    if (!segments.length) return 'Add at least one destination.';
    if (form.dateMode === 'exact' && new Date(form.endDate) < new Date(form.startDate)) return 'Trip end date cannot be before start date.';
    if (!Number.isFinite(totalBudget) || totalBudget < 0) return 'Budget must be a valid number.';

    const invalidSegment = segments.find((segment) => new Date(segment.endDate) < new Date(segment.startDate));
    if (invalidSegment) return 'Destination end date cannot be before its start date.';

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSaving(true);
    setFormError('');

    const submitDates = form.dateMode === 'flexible'
      ? getFlexibleDateRange(form.flexibleMonth, form.flexibleWindowDays)
      : { startDate: form.startDate, endDate: form.endDate };

    const segments = form.destinationSegments
      .filter((segment) => segment.city.trim())
      .map((segment, index) => ({
        city: segment.city.trim(),
        country: segment.country.trim(),
        countryCode: segment.countryCode,
        startDate: form.dateMode === 'flexible' ? submitDates.startDate : segment.startDate,
        endDate: form.dateMode === 'flexible' ? submitDates.endDate : segment.endDate,
        order: index + 1,
      }));

    const payload = {
      title: form.title.trim(),
      destination: segments[0].city,
      country: segments[0].country,
      startDate: submitDates.startDate,
      endDate: submitDates.endDate,
      planningMode: createMode,
      budget: {
        totalAmount: Number(form.budgetAmount || 0),
        dailyLimit: 0,
        currency: activeCurrencyCode,
      },
      destinationSegments: segments,
      dateFlexibility: {
        mode: form.dateMode,
        windowDays: form.dateMode === 'flexible' ? Number(form.flexibleWindowDays) : 0,
        preferredMonth: form.dateMode === 'flexible'
          ? flexibleMonthOptions.find((month) => month.value === form.flexibleMonth)?.label || ''
          : '',
      },
      travelPreferences: {
        styles: form.styles.map((value) => value.toLowerCase().replace(/\s+/g, '-')),
        pace: 'moderate',
        accommodation: 'comfort',
      },
      documentChecklist: {
        enabled: form.createDocumentChecklist,
        documentTypes: form.createDocumentChecklist ? form.documentTypes : [],
      },
      notes: form.aiPrompt.trim() ? [{ content: form.aiPrompt.trim() }] : [],
    };

    try {
      const response = await createTrip(payload);
      const trip = response.data?.data?.trip;

      if (trip && form.createPackingList) {
        await createPackingList({
          title: `${trip.title || trip.destination} packing list`,
          tripId: trip._id,
        });
      }

      navigate(`/trips/${trip._id}`);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Unable to create trip.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="trips-page trips-page-comfort" aria-labelledby="trips-page-title">
      <div className="trips-header">
        <div>
          <p className="eyebrow">Trip planning workspace</p>
          <h2 id="trips-page-title">Create a Trip</h2>
          <p>Set the trip foundation here. Itinerary, ideas, day notes, and budget allocation are managed after creation.</p>
        </div>
        <div className="trips-header-actions" role="tablist" aria-label="Trip menu">
          <button
            className={activeView === 'create' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'create'}
            onClick={() => setActiveView('create')}
          >
            <Plus size={16} aria-hidden="true" />
            Create
          </button>
          <button
            className={activeView === 'my-trips' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'my-trips'}
            onClick={() => setActiveView('my-trips')}
          >
            <ListChecks size={16} aria-hidden="true" />
            My Trips
            <span className="trip-count-badge">{trips.length}</span>
          </button>
        </div>
      </div>

      {message && <p className="form-error trips-status" role="alert">{message}</p>}

      {activeView === 'my-trips' ? (
        <section className="trip-directory" aria-labelledby="my-trips-title">
          <div className="trip-directory-hero">
            <div>
              <span>Trip workspace</span>
              <h3 id="my-trips-title">My Trips</h3>
              <p>Pick up planning where you left off, compare upcoming routes, and keep every destination visible.</p>
            </div>
            <div className="trip-directory-hero-card" aria-hidden="true">
              <span>{trips.length}</span>
              <small>saved plans</small>
            </div>
            <button type="button" onClick={() => setActiveView('create')}>
              <Plus size={16} aria-hidden="true" />
              New trip
            </button>
          </div>

          <div className="trip-directory-stats" aria-label="Trip directory summary">
            <span>
              <i><ListChecks size={17} aria-hidden="true" /></i>
              <small>Saved trips</small>
              <strong>{trips.length} trip{trips.length === 1 ? '' : 's'}</strong>
            </span>
            <span>
              <i><MapPin size={17} aria-hidden="true" /></i>
              <small>Countries</small>
              <strong>{new Set(trips.map((trip) => trip.country).filter(Boolean)).size} countr{new Set(trips.map((trip) => trip.country).filter(Boolean)).size === 1 ? 'y' : 'ies'}</strong>
            </span>
            <span>
              <i><CalendarDays size={17} aria-hidden="true" /></i>
              <small>Upcoming</small>
              <strong>{trips.filter((trip) => new Date(trip.endDate) >= new Date(today)).length} active</strong>
            </span>
          </div>

          <div className="trip-directory-header">
            <div>
              <span>Saved trips</span>
              <h4>Trip library</h4>
            </div>
          </div>

          <label className="trip-search-field trip-search-field-large">
            <Search size={16} aria-hidden="true" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by title, destination, or country" />
          </label>

          {status === 'loading' ? (
            <p className="settings-empty"><LoaderCircle className="trip-spin" size={16} aria-hidden="true" /> Loading trips...</p>
          ) : visibleTrips.length === 0 ? (
            <div className="trip-empty-state">
              <MapPin size={30} aria-hidden="true" />
              <h3>No saved trips yet</h3>
              <p>Create a trip first, then manage the itinerary and ideas in the details page.</p>
              <button type="button" onClick={() => setActiveView('create')}>Create trip</button>
            </div>
          ) : (
            <div className="trip-directory-grid">
              {visibleTrips.map((trip) => {
                const tripDays = getDurationDays(trip.startDate, trip.endDate);

                return (
                  <Link className="trip-directory-card" to={`/trips/${trip._id}`} key={trip._id}>
                    <div className="trip-directory-card-art">
                      <MapPin size={20} aria-hidden="true" />
                    </div>
                    <div className="trip-directory-card-top">
                      <span>{trip.planningMode === 'ai' ? 'AI assisted' : 'Manual plan'}</span>
                      <em>{tripDays} day{tripDays === 1 ? '' : 's'}</em>
                    </div>
                    <strong>{trip.title || trip.destination}</strong>
                    <div className="trip-directory-card-meta">
                      <small><CalendarDays size={14} aria-hidden="true" />{formatDateRange(trip.startDate, trip.endDate)}</small>
                      <small><MapPin size={14} aria-hidden="true" />{[trip.destination, trip.country].filter(Boolean).join(', ')}</small>
                    </div>
                    <div className="trip-directory-card-footer">
                      <span>{trip.dateFlexibility?.mode === 'flexible' ? 'Flexible dates' : 'Exact dates'}</span>
                      <em>
                        Open details
                        <ArrowRight size={15} aria-hidden="true" />
                      </em>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : (
      <div className="trip-comfort-layout">
        <form className="trip-create-form trip-create-form-comfort" onSubmit={handleSubmit}>
          <div className="trip-create-hero">
            <div>
              <span>New trip setup</span>
              <h3>Shape the trip foundation.</h3>
              <p>Set the core details now, then use the details page for daily timing, places, notes, and budget distribution.</p>
            </div>
            <div className="trip-create-actions">
              <div className="trip-mode-toggle" role="group" aria-label="Trip creation mode">
                <button className={createMode === 'self' ? 'active' : ''} type="button" onClick={() => setCreateMode('self')}>
                  <ListChecks size={16} aria-hidden="true" />
                  Manual
                </button>
                <button className={createMode === 'ai' ? 'active' : ''} type="button" onClick={() => setCreateMode('ai')}>
                  <Bot size={16} aria-hidden="true" />
                  AI Assist
                </button>
              </div>
              <button className="primary-action trip-save-button" type="submit" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="trip-spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
                Create Trip
              </button>
            </div>
          </div>

          <div className="trip-form-summary" aria-label="Trip setup summary">
            <span>
              <i><CalendarDays size={17} aria-hidden="true" /></i>
              <small>Trip length</small>
              <strong>{durationDays} day{durationDays === 1 ? '' : 's'}</strong>
            </span>
            <span>
              <i><MapPin size={17} aria-hidden="true" /></i>
              <small>Stops</small>
              <strong>{previewSegments.length || 0} stop{previewSegments.length === 1 ? '' : 's'}</strong>
            </span>
            <span>
              <i><WalletCards size={17} aria-hidden="true" /></i>
              <small>Budget currency</small>
              <strong>{activeCurrencyCode}</strong>
            </span>
          </div>

          <nav className="trip-step-nav" aria-label="Trip creation steps">
            <a href="#trip-step-basics">
              <span>01</span>
              <strong>Trip Basics</strong>
            </a>
            <a href="#trip-step-destination">
              <span>02</span>
              <strong>Destination</strong>
            </a>
            <a href="#trip-step-preferences">
              <span>03</span>
              <strong>Preferences</strong>
            </a>
          </nav>

          <section id="trip-step-basics" className="trip-create-section trip-essentials-section" aria-labelledby="essentials-title">
            <div className="trip-section-heading">
              <span className="trip-section-icon"><CalendarDays size={18} aria-hidden="true" /></span>
              <div>
                <span className="trip-section-step-label">Step 01</span>
                <h3 id="essentials-title">Trip Basics</h3>
                <p>Give the trip a name, date range, and total budget.</p>
              </div>
            </div>

            <div className="trip-form-grid">
              <label>
                <span>Trip title</span>
                <input value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Penang food weekend" />
              </label>
              <label>
                <span>Whole trip budget ({activeCurrencyCode})</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budgetAmount}
                  onChange={(event) => updateField('budgetAmount', event.target.value)}
                  placeholder="2500"
                />
              </label>
            </div>

            <div className="trip-date-box">
              <div className="trip-date-toggle" role="group" aria-label="Date type">
                <button className={form.dateMode === 'exact' ? 'active' : ''} type="button" onClick={() => updateField('dateMode', 'exact')}>
                  Exact dates
                </button>
                <button className={form.dateMode === 'flexible' ? 'active' : ''} type="button" onClick={() => updateField('dateMode', 'flexible')}>
                  Flexible
                </button>
              </div>
              {form.dateMode === 'exact' ? (
                <div className="trip-form-grid">
                  <label>
                    <span>Start date</span>
                    <input type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
                  </label>
                  <label>
                    <span>End date</span>
                    <input type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} />
                  </label>
                </div>
              ) : (
                <div className="trip-flexible-picker">
                  <div>
                    <span className="trip-field-title">Days</span>
                    <div className="trip-flexible-options">
                      {flexibleDayOptions.map((days) => (
                        <button
                          className={Number(form.flexibleWindowDays) === days ? 'active' : ''}
                          type="button"
                          key={days}
                          onClick={() => updateField('flexibleWindowDays', days)}
                        >
                          {days} day{days === 1 ? '' : 's'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="trip-field-title">Month</span>
                    <div className="trip-flexible-options">
                      {flexibleMonthOptions.map((month) => (
                        <button
                          className={form.flexibleMonth === month.value ? 'active' : ''}
                          type="button"
                          key={month.value}
                          onClick={() => updateField('flexibleMonth', month.value)}
                        >
                          {month.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="trip-flexible-summary">
                    We'll create a {durationDays}-day planning window in {flexibleMonthOptions.find((month) => month.value === form.flexibleMonth)?.label}.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section id="trip-step-destination" className="trip-create-section" aria-labelledby="destinations-title">
            <div className="trip-section-heading">
              <span className="trip-section-icon trip-section-icon-destination"><MapPin size={18} aria-hidden="true" /></span>
              <div>
                <span className="trip-section-step-label">Step 02</span>
                <h3 id="destinations-title">Destination</h3>
                <p>Choose the main place for this trip. Extra stops are optional.</p>
              </div>
            </div>

            <p className="trip-section-helper">
              Choose a country first, then select the state or region you want recommendations for. Additional stops can be added here, while daily planning happens on the details page.
            </p>
            <div className="trip-segment-list trip-simple-segments">
              {form.destinationSegments.map((segment, index) => (
                <article className="trip-segment-card" key={`${segment.order}-${index}`}>
                  <div className="trip-segment-number">{index + 1}</div>
                  <div className="trip-segment-fields">
                    <label>
                      <span>Country</span>
                      <select value={segment.countryCode} onChange={(event) => updateSegmentCountry(index, event.target.value)}>
                        <option value="">Select country</option>
                        {countries.map((country) => (
                          <option key={country.isoCode} value={country.isoCode}>{country.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>State or region</span>
                      <select
                        value={segment.city}
                        onChange={(event) => updateSegment(index, 'city', event.target.value)}
                        disabled={!segment.countryCode}
                      >
                        <option value="">{segment.countryCode ? 'Select state or region' : 'Select country first'}</option>
                        {(stateOptionsByCountry[segment.countryCode] || []).map((state) => (
                          <option key={state.isoCode} value={state.name}>{state.name}</option>
                        ))}
                      </select>
                    </label>
                    {form.dateMode === 'exact' && (
                      <>
                        <label>
                          <span>From</span>
                          <input type="date" value={segment.startDate} onChange={(event) => updateSegment(index, 'startDate', event.target.value)} />
                        </label>
                        <label>
                          <span>To</span>
                          <input type="date" value={segment.endDate} onChange={(event) => updateSegment(index, 'endDate', event.target.value)} />
                        </label>
                      </>
                    )}
                  </div>
                  {form.destinationSegments.length > 1 && (
                    <button className="trip-remove-segment" type="button" onClick={() => removeSegment(index)}>
                      Remove
                    </button>
                  )}
                </article>
              ))}
            </div>
            <button className="trip-secondary-link" type="button" onClick={addSegment}>
              <Plus size={16} aria-hidden="true" />
              Add another country or state
            </button>
          </section>

          {createMode === 'ai' && (
            <label className="trip-ai-prompt">
              <span>
                <Sparkles size={16} aria-hidden="true" />
                AI prompt
              </span>
              <textarea
                value={form.aiPrompt}
                onChange={(event) => updateField('aiPrompt', event.target.value)}
                placeholder="Relaxed trip with food, short walks, and rainy-day alternatives."
              />
            </label>
          )}

          <details id="trip-step-preferences" className="trip-optional-details">
            <summary>
              <span>
                <em className="trip-section-icon trip-section-icon-preferences"><Sparkles size={18} aria-hidden="true" /></em>
                <span className="trip-section-step-label">Step 03</span>
                <strong>Preferences and setup</strong>
                <small>Optional travel style, packing list, and document checklist</small>
              </span>
            </summary>
            <div className="trip-create-section">
              <span className="trip-field-title">Travel style</span>
              <div className="trip-choice-grid">
                {styleOptions.map((option) => (
                  <button
                    className={form.styles.includes(option) ? 'active' : ''}
                    type="button"
                    key={option}
                    onClick={() => toggleArrayValue('styles', option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="trip-tool-grid">
                <label className="trip-tool-card">
                  <input type="checkbox" checked={form.createPackingList} onChange={(event) => updateField('createPackingList', event.target.checked)} />
                  <span>
                    <ListChecks size={18} aria-hidden="true" />
                    <strong>Create packing list</strong>
                  </span>
                </label>
                <label className="trip-tool-card">
                  <input type="checkbox" checked={form.createDocumentChecklist} onChange={(event) => updateField('createDocumentChecklist', event.target.checked)} />
                  <span>
                    <FileText size={18} aria-hidden="true" />
                    <strong>Create document checklist</strong>
                  </span>
                </label>
              </div>
              {form.createDocumentChecklist && (
                <div className="trip-choice-grid">
                  {documentOptions.map((option) => (
                    <button
                      className={form.documentTypes.includes(option) ? 'active' : ''}
                      type="button"
                      key={option}
                      onClick={() => toggleArrayValue('documentTypes', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </details>

          <div className="trip-budget-summary">
            <WalletCards size={18} aria-hidden="true" />
            <span>
              Save the whole-trip budget now. Distribute daily budgets on the trip details page.
              {totalBudget > 0 ? ` ${currency?.formatAmount ? currency.formatAmount(totalBudget, activeCurrencyCode) : totalBudget}` : ''}
            </span>
          </div>

          {formError && <p className="form-error trips-status" role="alert">{formError}</p>}
        </form>

        <aside className="trip-side-rail" aria-label="Saved trips">
          <div className="trip-preview-panel">
            <div className="trip-preview-card-header">
              <div>
                <span>Live snapshot</span>
                <h3>{form.title || 'Untitled trip'}</h3>
              </div>
              <small>{previewSegments.length || 0} stop{previewSegments.length === 1 ? '' : 's'}</small>
            </div>
            <TripMapPreview places={previewSegments} />
            <div className="trip-preview-content">
              <div className="trip-preview-heading">
                <span>Trip window</span>
                <p>{formatDateRange(form.startDate, form.endDate)}</p>
              </div>
              <div className="trip-preview-metrics">
                <span>{durationDays} days</span>
                <span>{form.dateMode === 'flexible' ? `Flexible ${form.flexibleWindowDays}d` : 'Exact dates'}</span>
                <span>{totalBudget > 0 ? (currency?.formatAmount ? currency.formatAmount(totalBudget, activeCurrencyCode) : `${activeCurrencyCode} ${totalBudget}`) : 'No budget'}</span>
              </div>
            </div>
          </div>

          <section className="trip-list-workspace trip-recent-list" aria-labelledby="recent-trips-title">
            <div className="trip-list-header">
              <div>
                <span>Saved</span>
                <h3 id="recent-trips-title">Recent Trips</h3>
              </div>
              <button type="button" onClick={() => setActiveView('my-trips')}>View all</button>
            </div>
            <label className="trip-search-field">
              <Search size={16} aria-hidden="true" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search trips" />
            </label>
            {status === 'loading' ? (
              <p className="settings-empty"><LoaderCircle className="trip-spin" size={16} aria-hidden="true" /> Loading trips...</p>
            ) : visibleTrips.length === 0 ? (
              <p className="settings-empty">No saved trips yet.</p>
            ) : (
              <div className="trip-card-grid trip-card-grid-compact">
                {visibleTrips.map((trip) => (
                  <Link className="trip-list-card" to={`/trips/${trip._id}`} key={trip._id}>
                    <span className="trip-card-title">{trip.title || trip.destination}</span>
                    <span className="trip-card-meta"><CalendarDays size={14} aria-hidden="true" />{formatDateRange(trip.startDate, trip.endDate)}</span>
                    <span className="trip-card-meta"><MapPin size={14} aria-hidden="true" />{trip.destination}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
      )}
    </section>
  );
}

export default TripsPage;
