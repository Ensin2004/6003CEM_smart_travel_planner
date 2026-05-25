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
  const [primaryCityOptions, setPrimaryCityOptions] = useState([]);
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
  const durationDays = getDurationDays(form.startDate, form.endDate);

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
      .then(({ City }) => {
        if (isMounted) setPrimaryCityOptions(City.getCitiesOfCountry(primarySegment.countryCode).slice(0, 120));
      })
      .catch(() => {
        if (isMounted) setPrimaryCityOptions([]);
      });

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
    if (index === 0) setPrimaryCityOptions([]);
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
    if (new Date(form.endDate) < new Date(form.startDate)) return 'Trip end date cannot be before start date.';
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

    const segments = form.destinationSegments
      .filter((segment) => segment.city.trim())
      .map((segment, index) => ({
        city: segment.city.trim(),
        country: segment.country.trim(),
        countryCode: segment.countryCode,
        startDate: segment.startDate,
        endDate: segment.endDate,
        order: index + 1,
      }));

    const payload = {
      title: form.title.trim(),
      destination: segments[0].city,
      country: segments[0].country,
      startDate: form.startDate,
      endDate: form.endDate,
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
          <div className="trip-directory-header">
            <div>
              <span>Saved trips</span>
              <h3 id="my-trips-title">My Trips</h3>
            </div>
            <button type="button" onClick={() => setActiveView('create')}>
              <Plus size={16} aria-hidden="true" />
              New trip
            </button>
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
              {visibleTrips.map((trip) => (
                <Link className="trip-directory-card" to={`/trips/${trip._id}`} key={trip._id}>
                  <span>{trip.planningMode === 'ai' ? 'AI assisted' : 'Manual plan'}</span>
                  <strong>{trip.title || trip.destination}</strong>
                  <small><CalendarDays size={14} aria-hidden="true" />{formatDateRange(trip.startDate, trip.endDate)}</small>
                  <small><MapPin size={14} aria-hidden="true" />{[trip.destination, trip.country].filter(Boolean).join(', ')}</small>
                  <em>
                    Open details
                    <ArrowRight size={15} aria-hidden="true" />
                  </em>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
      <div className="trip-comfort-layout">
        <form className="trip-create-form trip-create-form-comfort" onSubmit={handleSubmit}>
          <div className="trip-create-hero">
            <div>
              <span>New trip setup</span>
              <h3>Start with the parts that define the trip.</h3>
              <p>Keep the creation flow short. The itinerary page handles daily planning, notes, ideas, and budget distribution.</p>
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
              <CalendarDays size={15} aria-hidden="true" />
              <strong>{durationDays}</strong>
              day{durationDays === 1 ? '' : 's'}
            </span>
            <span>
              <MapPin size={15} aria-hidden="true" />
              <strong>{previewSegments.length || 0}</strong>
              stop{previewSegments.length === 1 ? '' : 's'}
            </span>
            <span>
              <WalletCards size={15} aria-hidden="true" />
              <strong>{activeCurrencyCode}</strong>
              budget
            </span>
          </div>

          <section className="trip-create-section trip-essentials-section" aria-labelledby="essentials-title">
            <div className="trip-section-heading">
              <div>
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
              <div className="trip-form-grid">
                <label>
                  <span>Start date</span>
                  <input type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
                </label>
                <label>
                  <span>End date</span>
                  <input type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} />
                </label>
                {form.dateMode === 'flexible' && (
                  <label>
                    <span>Flexible by days</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={form.flexibleWindowDays}
                      onChange={(event) => updateField('flexibleWindowDays', event.target.value)}
                    />
                  </label>
                )}
              </div>
            </div>
          </section>

          <section className="trip-create-section" aria-labelledby="destinations-title">
            <div className="trip-section-heading">
              <div>
                <h3 id="destinations-title">Destination</h3>
                <p>Choose the main place for this trip. Extra stops are optional.</p>
              </div>
            </div>

            <p className="trip-section-helper">
              Choose a country first, then enter a city or destination. Additional stops can be added here, while daily planning happens on the details page.
            </p>
            <datalist id="primary-city-options">
              {primaryCityOptions.map((city) => (
                <option key={`${city.name}-${city.stateCode}`} value={city.name}>
                  {city.stateCode ? `${city.name}, ${city.stateCode}` : city.name}
                </option>
              ))}
            </datalist>
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
                      <span>City or destination</span>
                      <input
                        list={index === 0 ? 'primary-city-options' : undefined}
                        value={segment.city}
                        onChange={(event) => updateSegment(index, 'city', event.target.value)}
                        placeholder={segment.countryCode ? 'Start typing a city' : 'Select country first'}
                      />
                    </label>
                    <label>
                      <span>From</span>
                      <input type="date" value={segment.startDate} onChange={(event) => updateSegment(index, 'startDate', event.target.value)} />
                    </label>
                    <label>
                      <span>To</span>
                      <input type="date" value={segment.endDate} onChange={(event) => updateSegment(index, 'endDate', event.target.value)} />
                    </label>
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
              Add another country or city
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

          <details className="trip-optional-details">
            <summary>
              <span>
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
