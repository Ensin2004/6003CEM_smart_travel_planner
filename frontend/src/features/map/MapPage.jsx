import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BedDouble,
  ChevronRight,
  Clock3,
  Heart,
  Layers,
  LocateFixed,
  MapPin,
  Mountain,
  Plane,
  Search,
  ShoppingBag,
  Star,
  TrainFront,
  Trash2,
  Utensils,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { searchOpenStreetMapPlaces } from '../../api/mapApi';
import './MapPage.css';

const defaultCenter = [5.4141, 100.3288];
const defaultZoom = 8;

const categoryConfig = {
  hotels: { label: 'Hotels', icon: BedDouble, color: '#2563eb' },
  airports: { label: 'Airport', icon: Plane, color: '#7c3aed' },
  train: { label: 'Station', icon: TrainFront, color: '#4f46e5' },
  food: { label: 'Food', icon: Utensils, color: '#f97316' },
  attractions: { label: 'Attractions', icon: Mountain, color: '#0891b2' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: '#db2777' },
  saved: { label: 'Saved', icon: Heart, color: '#ef4444' },
};

const filterOrder = ['hotels', 'airports', 'train', 'food', 'attractions', 'shopping', 'saved'];
const userMarkersStorageKey = 'smartTravelPlanner.map.userMarkers';

const mapTileLayers = {
  default: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satellite: {
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
};

const fallbackPlaceImages = {
  hotels: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=640&q=80',
  airports: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=640&q=80',
  train: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=640&q=80',
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=640&q=80',
  attractions: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&q=80',
  shopping: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=640&q=80',
  saved: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=640&q=80',
};

const penangLandCoordinates = [
  [5.4141, 100.3288],
  [5.4382, 100.3091],
  [5.3999, 100.2733],
  [5.4177, 100.3404],
  [5.3333, 100.3065],
  [5.3942, 100.3664],
  [5.3634, 100.4595],
  [5.4757, 100.2498],
  [5.4705, 100.2455],
  [5.2971, 100.2779],
];

const recommendationOffsets = [
  [0.012, 0.014],
  [0.018, -0.018],
  [-0.014, 0.016],
  [-0.018, -0.012],
  [0.026, 0.004],
  [-0.026, -0.004],
  [0.006, -0.03],
  [-0.006, 0.03],
  [0.034, -0.026],
  [-0.034, 0.026],
];

const createReviewItems = (name) => [
  {
    id: `${name}-review-1`,
    author: 'Alicia Tan',
    rating: '5.0',
    text: 'Easy to visit, clean surroundings, and worth adding to a short itinerary.',
  },
  {
    id: `${name}-review-2`,
    author: 'Daniel Wong',
    rating: '4.5',
    text: 'Good location with plenty of nearby food and transport options.',
  },
  {
    id: `${name}-review-3`,
    author: 'Mei Chen',
    rating: '4.0',
    text: 'Best experience when visiting outside peak hours.',
  },
];

const getPlaceImage = (categoryId, name = '') => {
  const encodedName = encodeURIComponent(name || categoryConfig[categoryId]?.label || 'travel');
  return `https://source.unsplash.com/640x420/?${encodedName},travel`;
};

const cityRecommendationSets = {
  default: [
  {
    id: 'george-town',
    rank: 'No.1',
    name: 'George Town',
    score: '5.9',
    stay: '2-4 days recommended',
    highlight: 'Pinang Peranakan Mansion',
    lat: 5.4141,
    lng: 100.3288,
    image: 'https://images.unsplash.com/photo-1609856626407-31caec6804d5?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'batu-ferringhi',
    rank: 'No.2',
    name: 'Batu Ferringhi',
    score: '2.9',
    stay: '2-4 days recommended',
    highlight: 'Batu Ferringhi Beach',
    lat: 5.4753,
    lng: 100.2467,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'jelutong',
    rank: 'No.3',
    name: 'Jelutong',
    score: '2.1',
    stay: 'Urban food stops',
    highlight: 'Karpal Singh Drive',
    lat: 5.3915,
    lng: 100.3168,
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'southwest-penang',
    rank: 'No.4',
    name: 'Southwest Penang Island',
    score: '1.9',
    stay: 'Nature and farms',
    highlight: 'Entopia by Penang Butterfly Farm',
    lat: 5.3337,
    lng: 100.2249,
    image: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'bukit-mertajam',
    rank: 'No.5',
    name: 'Bukit Mertajam',
    score: '1.8',
    stay: 'Local heritage',
    highlight: 'Minor Basilica of St. Anne',
    lat: 5.363,
    lng: 100.4667,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=240&q=80',
  },
  ],
  japan: [
    {
      id: 'tokyo',
      rank: 'No.1',
      name: 'Tokyo',
      score: '9.8',
      stay: '4-6 days recommended',
      highlight: 'Shibuya Crossing',
      lat: 35.6762,
      lng: 139.6503,
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=240&q=80',
    },
    {
      id: 'kyoto',
      rank: 'No.2',
      name: 'Kyoto',
      score: '8.9',
      stay: '3-5 days recommended',
      highlight: 'Fushimi Inari Taisha',
      lat: 35.0116,
      lng: 135.7681,
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=240&q=80',
    },
    {
      id: 'osaka',
      rank: 'No.3',
      name: 'Osaka',
      score: '8.4',
      stay: '2-4 days recommended',
      highlight: 'Dotonbori',
      lat: 34.6937,
      lng: 135.5023,
      image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=240&q=80',
    },
    {
      id: 'sapporo',
      rank: 'No.4',
      name: 'Sapporo',
      score: '7.5',
      stay: '2-4 days recommended',
      highlight: 'Odori Park',
      lat: 43.0618,
      lng: 141.3545,
      image: 'https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?auto=format&fit=crop&w=240&q=80',
    },
    {
      id: 'fukuoka',
      rank: 'No.5',
      name: 'Fukuoka',
      score: '7.2',
      stay: '2-3 days recommended',
      highlight: 'Canal City Hakata',
      lat: 33.5902,
      lng: 130.4017,
      image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=240&q=80',
    },
  ],
};

const placeDetailsFallback = {
  hours: 'Open today: 9:00 AM - 8:00 PM',
  address: 'Penang, Malaysia',
  rating: '4.6',
  reviews: '1,284 reviews',
  summary: 'Popular with travellers for convenient access, nearby food, and easy trip planning.',
  image: fallbackPlaceImages.attractions,
};

const categoryMarkers = {
  hotels: [
    {
      id: 'hotel-eo',
      name: 'Eastern & Oriental Hotel',
      address: '10 Lebuh Farquhar, George Town',
      hours: 'Open 24 hours',
      rating: '4.7',
      reviews: '4,218 reviews',
      lat: 5.4238,
      lng: 100.3359,
    },
    {
      id: 'hotel-shangri-la',
      name: 'Shangri-La Rasa Sayang',
      address: 'Batu Ferringhi Beach',
      hours: 'Open 24 hours',
      rating: '4.6',
      reviews: '5,902 reviews',
      lat: 5.4757,
      lng: 100.2498,
    },
  ],
  airports: [
    {
      id: 'airport-penang',
      name: 'Penang International Airport',
      address: 'Bayan Lepas, Penang',
      hours: 'Open 24 hours',
      rating: '4.1',
      reviews: '8,364 reviews',
      lat: 5.2971,
      lng: 100.2779,
    },
    {
      id: 'airport-langkawi',
      name: 'Langkawi International Airport',
      address: 'Padang Matsirat, Langkawi',
      hours: 'Open 24 hours',
      rating: '4.2',
      reviews: '3,118 reviews',
      lat: 6.3297,
      lng: 99.7287,
    },
  ],
  train: [
    {
      id: 'train-butterworth',
      name: 'Butterworth Railway Station',
      address: 'Penang Sentral, Butterworth',
      hours: 'Open today: 5:00 AM - 12:00 AM',
      rating: '4.0',
      reviews: '1,536 reviews',
      lat: 5.3942,
      lng: 100.3664,
    },
    {
      id: 'train-bukit-mertajam',
      name: 'Bukit Mertajam KTM Station',
      address: 'Jalan Stesen, Bukit Mertajam',
      hours: 'Open today: 5:30 AM - 11:30 PM',
      rating: '3.9',
      reviews: '824 reviews',
      lat: 5.3634,
      lng: 100.4595,
    },
  ],
  food: [
    {
      id: 'food-line-clear',
      name: 'Line Clear Nasi Kandar',
      address: '177 Jalan Penang, George Town',
      hours: 'Open today: 10:00 AM - 10:00 PM',
      rating: '4.3',
      reviews: '6,702 reviews',
      lat: 5.4193,
      lng: 100.3312,
    },
    {
      id: 'food-gurney',
      name: 'Gurney Drive Hawker Centre',
      address: 'Persiaran Gurney, George Town',
      hours: 'Open today: 6:00 PM - 11:30 PM',
      rating: '4.2',
      reviews: '9,418 reviews',
      lat: 5.4382,
      lng: 100.3091,
    },
  ],
  attractions: [
    {
      id: 'attr-kek-lok-si',
      name: 'Kek Lok Si Temple',
      address: 'Air Itam, Penang',
      hours: 'Open today: 8:30 AM - 5:30 PM',
      rating: '4.5',
      reviews: '12,860 reviews',
      lat: 5.3999,
      lng: 100.2733,
    },
    {
      id: 'attr-penang-hill',
      name: 'Penang Hill',
      address: 'Bukit Bendera, Penang',
      hours: 'Open today: 6:30 AM - 10:00 PM',
      rating: '4.4',
      reviews: '18,430 reviews',
      lat: 5.4084,
      lng: 100.2777,
    },
    {
      id: 'attr-peranakan',
      name: 'Pinang Peranakan Mansion',
      address: '29 Church Street, George Town',
      hours: 'Open today: 9:30 AM - 5:00 PM',
      rating: '4.6',
      reviews: '5,216 reviews',
      lat: 5.4177,
      lng: 100.3404,
    },
  ],
  shopping: [
    {
      id: 'shop-gurney-plaza',
      name: 'Gurney Plaza',
      address: '170 Persiaran Gurney, George Town',
      hours: 'Open today: 10:00 AM - 10:00 PM',
      rating: '4.4',
      reviews: '16,902 reviews',
      lat: 5.4378,
      lng: 100.3109,
    },
    {
      id: 'shop-queensbay',
      name: 'Queensbay Mall',
      address: 'Persiaran Bayan Indah, Bayan Lepas',
      hours: 'Open today: 10:30 AM - 10:30 PM',
      rating: '4.4',
      reviews: '20,114 reviews',
      lat: 5.3333,
      lng: 100.3065,
    },
  ],
  saved: [
    {
      id: 'saved-chew-jetty',
      name: 'Chew Jetty',
      address: 'Pengkalan Weld, George Town',
      hours: 'Open today: 9:00 AM - 9:00 PM',
      rating: '4.1',
      reviews: '8,009 reviews',
      lat: 5.4136,
      lng: 100.3419,
    },
    {
      id: 'saved-tropical-spice',
      name: 'Tropical Spice Garden',
      address: 'Teluk Bahang, Penang',
      hours: 'Open today: 9:00 AM - 4:30 PM',
      rating: '4.5',
      reviews: '2,431 reviews',
      lat: 5.4705,
      lng: 100.2455,
    },
  ],
};

const categoryRecommendationNames = {
  hotels: [
    'The Prestige Hotel Penang',
    'Seven Terraces',
    'G Hotel Kelawai',
    'Lone Pine Penang',
    'JEN Penang Georgetown',
    'Areca Hotel Penang',
    'Campbell House',
    'The Edison George Town',
  ],
  airports: [
    'Sultan Abdul Halim Airport',
    'Sultan Azlan Shah Airport',
    'Hat Yai International Airport',
    'Kuala Lumpur International Airport',
    'Subang Airport',
    'Sultan Ismail Petra Airport',
    'Sultan Mahmud Airport',
    'Senai International Airport',
  ],
  train: [
    'Penang Sentral',
    'Nibong Tebal KTM Station',
    'Sungai Petani KTM Station',
    'Taiping Railway Station',
    'Ipoh Railway Station',
    'Alor Setar Railway Station',
    'Padang Besar Railway Station',
    'Kuala Lumpur Sentral',
  ],
  food: [
    'Teksen Restaurant',
    'Sister Curry Mee',
    'Joo Hooi Cafe',
    'Hameediyah Restaurant',
    'Tai Tong Restaurant',
    'China House',
    'Kimberley Street Food Night Market',
    'Deen Maju Nasi Kandar',
  ],
  attractions: [
    'Chew Jetty',
    'Clan Jetties of Penang',
    'Fort Cornwallis',
    'Khoo Kongsi',
    'Entopia by Penang Butterfly Farm',
    'Penang National Park',
    'Wonderfood Museum',
  ],
  shopping: [
    '1st Avenue Mall',
    'Prangin Mall',
    'Straits Quay',
    'Design Village Outlet Mall',
    'Sunshine Central',
    'Komtar',
    'Chowrasta Market',
    'Hin Bus Depot Market',
  ],
  saved: [
    'Armenian Street',
    'Kapitan Keling Mosque',
    'Penang Street Art',
    'The Habitat Penang Hill',
    'Batu Ferringhi Night Market',
    'Tropical Fruit Farm',
    'ESCAPE Penang',
    'Dhammikarama Burmese Temple',
  ],
};

const buildCategoryPlaces = (categoryId, places) => {
  const extraNames = categoryRecommendationNames[categoryId] || [];
  const supplementalPlaces = extraNames.slice(0, Math.max(0, 10 - places.length)).map((name, index) => ({
    id: `${categoryId}-recommended-${index + 1}`,
    name,
    address: `Recommended ${categoryConfig[categoryId].label.toLowerCase()} near Penang`,
    hours: index % 3 === 0 ? 'Open 24 hours' : 'Open today: 10:00 AM - 9:00 PM',
    rating: (4.1 + (index % 6) * 0.1).toFixed(1),
    reviews: `${(index + 2) * 731} reviews`,
    lat: penangLandCoordinates[(index + places.length) % penangLandCoordinates.length][0],
    lng: penangLandCoordinates[(index + places.length) % penangLandCoordinates.length][1],
  }));

  return [...places, ...supplementalPlaces].slice(0, 10).map((place, index) => ({
    ...place,
    categoryId,
    image: place.image || getPlaceImage(categoryId, place.name),
    reviewItems: place.reviewItems || createReviewItems(place.name),
    rank: `No.${index + 1}`,
  }));
};

const categoryPlaces = Object.fromEntries(
  Object.entries(categoryMarkers).map(([categoryId, places]) => [
    categoryId,
    buildCategoryPlaces(categoryId, places),
  ])
);

const loadUserMarkers = () => {
  try {
    const savedMarkers = JSON.parse(localStorage.getItem(userMarkersStorageKey) || '[]');
    return Array.isArray(savedMarkers) ? savedMarkers : [];
  } catch {
    return [];
  }
};

const saveUserMarkers = (markers) => {
  localStorage.setItem(userMarkersStorageKey, JSON.stringify(markers));
};

const getCurrentLocationLabel = (place) => {
  if (!place?.name || place.id === 'category-panel') {
    return 'current map area';
  }

  return place.name;
};

const getLocalizedCategoryPlaces = (categoryId, place, mapCenter = defaultCenter) => {
  const basePlaces = categoryPlaces[categoryId] || [];
  const centerLat = Number.isFinite(mapCenter?.[0]) ? mapCenter[0] : defaultCenter[0];
  const centerLng = Number.isFinite(mapCenter?.[1]) ? mapCenter[1] : defaultCenter[1];
  const locationLabel = getCurrentLocationLabel(place);
  const isPenangArea = `${place?.name || ''} ${place?.displayName || ''}`.toLowerCase().includes('penang');
  const isNearDefaultCenter = Math.abs(centerLat - defaultCenter[0]) < 0.2 && Math.abs(centerLng - defaultCenter[1]) < 0.2;

  if ((isPenangArea || place?.id === 'penang') && isNearDefaultCenter) {
    return basePlaces;
  }

  return basePlaces.map((basePlace, index) => {
    const [latOffset, lngOffset] = recommendationOffsets[index % recommendationOffsets.length];

    return {
      ...basePlace,
      id: `${categoryId}-${place?.id || 'current'}-${index + 1}`,
      address: `${categoryConfig[categoryId].label} near ${locationLabel}`,
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      rank: `No.${index + 1}`,
    };
  });
};

const isCountryResult = (place) => (
  place?.category === 'boundary' ||
  ['country', 'state', 'province', 'administrative'].includes(place?.type)
);

const getCityRecommendations = (place) => {
  const text = `${place?.name || ''} ${place?.displayName || ''}`.toLowerCase();

  if (text.includes('japan')) {
    return cityRecommendationSets.japan;
  }

  return cityRecommendationSets.default;
};

const inferCategoryFromSearch = (query, place) => {
  const text = `${query} ${place?.category || ''} ${place?.type || ''}`.toLowerCase();

  if (text.includes('hotel') || text.includes('resort')) return 'hotels';
  if (text.includes('airport') || text.includes('aerodrome')) return 'airports';
  if (text.includes('train') || text.includes('railway') || text.includes('station')) return 'train';
  if (text.includes('restaurant') || text.includes('food') || text.includes('cafe')) return 'food';
  if (text.includes('mall') || text.includes('shop') || text.includes('market')) return 'shopping';

  return 'attractions';
};

const createMapIcon = (pin, categoryId) => {
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  const PinIcon = category.icon;
  const iconMarkup = renderToStaticMarkup(<PinIcon size={17} strokeWidth={2.4} />);

  return L.divIcon({
    className: '',
    html: `
      <span class="travel-map-pin" style="--pin-color: ${category.color}">
        <span class="travel-map-pin-icon">${iconMarkup}</span>
      </span>
    `,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -44],
  });
};

function MapFocus({ place }) {
  const map = useMap();

  useEffect(() => {
    if (place) {
      map.flyTo([place.lat, place.lng], place.zoom || 12, { duration: 0.75 });
    }
  }, [map, place]);

  return null;
}

function MapToolControls({ mapType, onToggleMapType, panelOpen }) {
  const map = useMap();
  const nextMapTypeLabel = mapType === 'default' ? 'Satellite map' : 'Default map';

  return (
    <div className={['map-tool-stack', panelOpen ? 'is-panel-open' : 'is-panel-closed'].join(' ')} aria-label="Map controls">
      <button type="button" onClick={() => map.zoomIn()} aria-label="Zoom in" data-tooltip="Zoom in">
        <ZoomIn size={22} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => map.zoomOut()} aria-label="Zoom out" data-tooltip="Zoom out">
        <ZoomOut size={22} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => map.flyTo(defaultCenter, defaultZoom)} aria-label="Recenter map" data-tooltip="Recenter map">
        <LocateFixed size={21} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleMapType}
        aria-label={`Switch to ${nextMapTypeLabel}`}
        data-tooltip={nextMapTypeLabel}
      >
        <Layers size={21} aria-hidden="true" />
      </button>
    </div>
  );
}

function MapClickHandler({ onAddMarker }) {
  useMapEvents({
    click(event) {
      onAddMarker(event.latlng);
    },
  });

  return null;
}

function MapViewportTracker({ onCenterChange }) {
  useMapEvents({
    moveend(event) {
      const center = event.target.getCenter();
      onCenterChange([center.lat, center.lng]);
    },
  });

  return null;
}

function PlaceDetails({ onRemove, place, categoryId }) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  const CategoryIcon = category.icon;
  const details = {
    ...placeDetailsFallback,
    ...place,
    image: place?.image || getPlaceImage(categoryId, place?.name),
    reviewItems: place?.reviewItems || createReviewItems(place?.name || 'place'),
  };

  return (
    <div className="map-place-details">
      <img className="map-detail-image" src={details.image} alt={details.name} loading="lazy" />

      <div className="map-detail-category" style={{ '--detail-color': category.color }}>
        <CategoryIcon size={17} aria-hidden="true" />
        {category.label}
      </div>

      <div className="map-detail-rating">
        <strong>{details.rating}</strong>
        <button type="button" onClick={() => setIsReviewOpen((isOpen) => !isOpen)}>
          <Star size={14} fill="currentColor" aria-hidden="true" />
          {details.reviews}
        </button>
      </div>

      {isReviewOpen ? (
        <div className="map-review-list">
          {details.reviewItems.map((review) => (
            <article key={review.id}>
              <strong>{review.author}</strong>
              <span>
                <Star size={12} fill="currentColor" aria-hidden="true" />
                {review.rating}
              </span>
              <p>{review.text}</p>
            </article>
          ))}
        </div>
      ) : null}

      <p>{details.summary}</p>

      <dl>
        <div>
          <dt>
            <Clock3 size={15} aria-hidden="true" />
            Business hours
          </dt>
          <dd>{details.hours}</dd>
        </div>
        <div>
          <dt>
            <MapPin size={15} aria-hidden="true" />
            Address
          </dt>
          <dd>{details.address || details.displayName}</dd>
        </div>
      </dl>

      {details.custom ? (
        <button className="map-remove-marker-button" type="button" onClick={() => onRemove(details.id)}>
          <Trash2 size={16} aria-hidden="true" />
          Remove marker
        </button>
      ) : null}
    </div>
  );
}

function MapPage() {
  const [query, setQuery] = useState('Penang');
  const [activeCategories, setActiveCategories] = useState(['attractions']);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [customMarkers, setCustomMarkers] = useState(() => loadUserMarkers());
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [mapType, setMapType] = useState('default');
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedPlace, setSelectedPlace] = useState({
    id: 'penang',
    name: 'Penang',
    displayName: 'Penang, Malaysia',
    lat: defaultCenter[0],
    lng: defaultCenter[1],
    zoom: defaultZoom,
    panelMode: 'country',
  });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const panelMode = selectedPlace?.panelMode || (isCountryResult(selectedPlace) ? 'country' : 'place');
  const selectedCategory = selectedPlace?.categoryId || activeCategories[0] || 'attractions';
  const selectedCountryCities = useMemo(() => getCityRecommendations(selectedPlace), [selectedPlace]);
  const selectedCategoryLabels = activeCategories.length
    ? activeCategories.map((categoryId) => categoryConfig[categoryId].label).join(', ')
    : 'No categories selected';

  const visibleMarkers = useMemo(() => {
    const selectedCategoryPlaces = activeCategories.flatMap((categoryId) => (
      getLocalizedCategoryPlaces(categoryId, selectedPlace, mapCenter)
    ));
    const mapPlaces = [...selectedCategoryPlaces, ...customMarkers];
    const isSelectedCategoryMarker = mapPlaces.some((place) => place.id === selectedPlace?.id);

    if (panelMode === 'place' && selectedPlace?.lat && selectedPlace?.lng && !isSelectedCategoryMarker) {
      return [selectedPlace, ...mapPlaces];
    }

    return mapPlaces;
  }, [activeCategories, customMarkers, mapCenter, panelMode, selectedPlace]);

  const topCategoryRecommendationGroups = useMemo(
    () => activeCategories.map((categoryId) => ({
      categoryId,
      places: getLocalizedCategoryPlaces(categoryId, selectedPlace, mapCenter).slice(0, 10),
    })),
    [activeCategories, mapCenter, selectedPlace]
  );
  const categoryRecommendationCount = topCategoryRecommendationGroups.reduce(
    (total, group) => total + group.places.length,
    0
  );
  const activeTileLayer = mapTileLayers[mapType];

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      try {
        const places = await searchOpenStreetMapPlaces(trimmedQuery, {
          limit: 5,
          signal: controller.signal,
        });
        setSuggestions(places);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    saveUserMarkers(customMarkers);
  }, [customMarkers]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setStatus('error');
      setMessage('Enter at least 2 characters to search.');
      return;
    }

    setStatus('loading');
    setMessage('Searching OpenStreetMap...');

    try {
      const places = await searchOpenStreetMapPlaces(trimmedQuery, { limit: 1 });

      if (!places.length) {
        setStatus('empty');
        setMessage('No matching places found.');
        return;
      }

      const place = places[0];
      const nextPanelMode = isCountryResult(place) ? 'country' : 'place';
      const nextCategory = inferCategoryFromSearch(trimmedQuery, place);

      if (nextPanelMode === 'place') {
        setActiveCategories([nextCategory]);
      }

      setSelectedPlace({
        ...placeDetailsFallback,
        ...place,
        address: place.displayName,
        categoryId: nextCategory,
        image: getPlaceImage(nextCategory, place.name),
        reviewItems: createReviewItems(place.name),
        zoom: nextPanelMode === 'country' ? 6 : 13,
        panelMode: nextPanelMode,
      });
      setMapCenter([place.lat, place.lng]);
      setStatus('success');
      setMessage('');
      setSuggestions([]);
      setIsSuggestionOpen(false);
      setIsPanelOpen(true);
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Unable to search this location.');
    }
  };

  const handleSelectCategory = (categoryId) => {
    setActiveCategories((currentCategories) => {
      if (currentCategories.includes(categoryId)) {
        return currentCategories.filter((currentCategory) => currentCategory !== categoryId);
      }

      return [...currentCategories, categoryId];
    });
    setSelectedPlace((currentPlace) => ({
      ...currentPlace,
      panelMode: 'category',
    }));
    setIsPanelOpen(true);
    setStatus('idle');
    setMessage('');
  };

  const handleSelectMarker = (marker) => {
    setSelectedPlace({
      ...marker,
      panelMode: 'place',
      zoom: 14,
    });
    setMapCenter([marker.lat, marker.lng]);
    setQuery(marker.name);
    setStatus('success');
    setMessage('');
    setIsSuggestionOpen(false);
    setIsPanelOpen(true);
  };

  const handleAddCustomMarker = (latlng) => {
    const markerNumber = customMarkers.length + 1;
    const nextMarker = {
      id: `custom-marker-${Date.now()}`,
      name: `My marker ${markerNumber}`,
      address: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
      hours: 'Custom marker',
      rating: 'Saved',
      reviews: 'Personal place',
      summary: 'A custom place added to the travel map.',
      image: fallbackPlaceImages.saved,
      lat: latlng.lat,
      lng: latlng.lng,
      categoryId: 'saved',
      custom: true,
      panelMode: 'place',
      zoom: 14,
      reviewItems: [
        {
          id: `custom-marker-${Date.now()}-note`,
          author: 'Personal note',
          rating: 'Saved',
          text: 'Use this marker to remember a place for the trip.',
        },
      ],
    };

    setCustomMarkers((markers) => [...markers, nextMarker]);
    setSelectedPlace(nextMarker);
    setMapCenter([nextMarker.lat, nextMarker.lng]);
    setQuery(nextMarker.name);
    setMessage('');
    setStatus('success');
    setIsPanelOpen(true);
  };

  const handleRemoveCustomMarker = (markerId) => {
    setCustomMarkers((markers) => markers.filter((marker) => marker.id !== markerId));
    setSelectedPlace((currentPlace) => (
      currentPlace?.id === markerId
        ? { ...currentPlace, id: 'category-panel', name: 'Top Places', panelMode: 'category', lat: defaultCenter[0], lng: defaultCenter[1], zoom: defaultZoom }
        : currentPlace
    ));
  };

  const handleSelectCity = (city) => {
    setSelectedPlace({
      ...placeDetailsFallback,
      id: city.id,
      name: city.name,
      displayName: `${city.name}, ${selectedPlace?.name || 'Destination'}`,
      address: `${city.name}, ${selectedPlace?.name || 'Destination'}`,
      lat: city.lat,
      lng: city.lng,
      categoryId: activeCategories[0],
      image: city.image,
      reviewItems: createReviewItems(city.name),
      zoom: 12,
      panelMode: 'place',
    });
    setMapCenter([city.lat, city.lng]);
    setQuery(city.name);
    setStatus('success');
    setMessage('');
    setIsSuggestionOpen(false);
    setIsPanelOpen(true);
  };

  const handleSelectSuggestion = (place) => {
    const nextPanelMode = isCountryResult(place) ? 'country' : 'place';
    const nextCategory = inferCategoryFromSearch(query, place);

    if (nextPanelMode === 'place') {
      setActiveCategories([nextCategory]);
    }

    setSelectedPlace({
      ...placeDetailsFallback,
      ...place,
      address: place.displayName,
      categoryId: nextCategory,
      image: getPlaceImage(nextCategory, place.name),
      reviewItems: createReviewItems(place.name),
      zoom: nextPanelMode === 'country' ? 6 : 13,
      panelMode: nextPanelMode,
    });
    setMapCenter([place.lat, place.lng]);
    setQuery(place.name);
    setSuggestions([]);
    setIsSuggestionOpen(false);
    setStatus('success');
    setMessage('');
    setIsPanelOpen(true);
  };

  return (
    <section className="map-page map-discovery-page" aria-labelledby="map-page-title">
      <div className="map-overlay-top">
        <form className="map-search-card" onSubmit={handleSearch}>
          <label htmlFor="map-search-input" className="sr-only">Search destination</label>
          <Search size={17} aria-hidden="true" />
          <input
            id="map-search-input"
            name="destination"
            type="text"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim().length < 2) {
                setSuggestions([]);
              }
              setIsSuggestionOpen(true);
            }}
            onFocus={() => setIsSuggestionOpen(true)}
            placeholder="Search country, city, place, or restaurant"
            autoComplete="off"
          />
          {query ? (
            <button
              className="map-search-clear"
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsSuggestionOpen(false);
              }}
              aria-label="Clear search"
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
          {isSuggestionOpen && suggestions.length ? (
            <div className="map-search-suggestions" role="listbox" aria-label="Search recommendations">
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectSuggestion(place)}
                >
                  <MapPin size={15} aria-hidden="true" />
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.displayName}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </form>

        <div className="map-filter-strip" aria-label="Map filters">
          {filterOrder.map((categoryId) => {
            const category = categoryConfig[categoryId];
            const FilterIcon = category.icon;

            return (
              <button
                className={activeCategories.includes(categoryId) ? 'is-active' : ''}
                key={categoryId}
                type="button"
                onClick={() => handleSelectCategory(categoryId)}
                style={{ '--category-color': category.color }}
              >
                <FilterIcon size={17} aria-hidden="true" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <p className={`map-floating-status map-status-${status}`} role={status === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}

      <div className="map-canvas" aria-label="Interactive travel map">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom
          zoomControl={false}
          className="leaflet-map"
        >
          <TileLayer
            attribution={activeTileLayer.attribution}
            url={activeTileLayer.url}
          />
          <MapFocus place={selectedPlace} />
          <MapClickHandler onAddMarker={handleAddCustomMarker} />
          <MapViewportTracker onCenterChange={setMapCenter} />
          <MapToolControls
            mapType={mapType}
            panelOpen={isPanelOpen}
            onToggleMapType={() => setMapType((currentType) => (currentType === 'default' ? 'satellite' : 'default'))}
          />
          {visibleMarkers.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={createMapIcon(pin, pin.categoryId || activeCategories[0])}
              eventHandlers={{
                click: (event) => {
                  if (event.originalEvent) {
                    L.DomEvent.stopPropagation(event.originalEvent);
                  }
                  handleSelectMarker(pin);
                },
              }}
            >
              <Popup closeButton={false}>
                <strong>{pin.name}</strong>
                <span>{pin.address}</span>
                {pin.custom ? (
                  <button
                    className="map-popup-remove"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveCustomMarker(pin.id);
                    }}
                  >
                    Remove marker
                  </button>
                ) : null}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {!isPanelOpen ? (
        <button className="map-panel-open-button" type="button" onClick={() => setIsPanelOpen(true)}>
          Open map panel
        </button>
      ) : null}

      {isPanelOpen ? (
      <aside className="map-destination-panel" aria-label="Destination recommendations">
        <div className="map-panel-header">
          <button type="button" aria-label="Close destination panel" onClick={() => setIsPanelOpen(false)}>
            <X size={22} aria-hidden="true" />
          </button>
          <h2 id="map-page-title">
            {panelMode === 'category' ? 'Top Places' : selectedPlace?.name || 'Penang'}
            <ChevronRight size={18} aria-hidden="true" />
          </h2>
          <p>
            {panelMode === 'country' ? '2-5 days recommended' : selectedCategoryLabels}
            <span>|</span>
            {panelMode === 'country'
              ? 'Recommended cities'
              : `${categoryRecommendationCount} recommended places`}
          </p>
        </div>

        {panelMode === 'country' ? (
          <>
            <div className="map-panel-section">
              <h3>Top Cities</h3>
              <p>Calculated using destination interest and traveller activity</p>
            </div>

            <div className="map-city-list">
              {selectedCountryCities.map((city) => (
                <button
                  className={selectedPlace?.id === city.id ? 'is-active' : ''}
                  key={city.id}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                >
                  <span className="map-city-image-wrap">
                    <img src={city.image} alt="" loading="lazy" />
                    <strong>{city.rank}</strong>
                  </span>
                  <span className="map-city-content">
                    <span className="map-city-title">{city.name}</span>
                    <span className="map-city-meta">
                      <Star size={12} fill="currentColor" aria-hidden="true" />
                      {city.score}
                      <small>{city.stay}</small>
                    </span>
                    <span className="map-city-tag">{city.highlight}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : panelMode === 'category' ? (
          <>
            <div className="map-panel-section">
              <h3>Top Places</h3>
              <p>Top 10 recommendations from selected categories</p>
            </div>

            <div className="map-city-list">
              {!categoryRecommendationCount ? (
                <div className="map-empty-selection">
                  Select one or more categories to show recommendations and markers.
                </div>
              ) : null}

              {topCategoryRecommendationGroups.map((group) => {
                const category = categoryConfig[group.categoryId];
                const GroupIcon = category.icon;

                return (
                  <section className="map-category-recommendation-group" key={group.categoryId}>
                    <h4 style={{ '--group-color': category.color }}>
                      <GroupIcon size={15} aria-hidden="true" />
                      Top 10 {category.label}
                    </h4>

                    {group.places.map((place) => {
                      const PlaceIcon = categoryConfig[place.categoryId].icon;

                      return (
                        <button
                          className={selectedPlace?.id === place.id ? 'is-active' : ''}
                          key={place.id}
                          type="button"
                          onClick={() => handleSelectMarker(place)}
                        >
                          <span
                            className="map-place-rank"
                            style={{ '--rank-color': categoryConfig[place.categoryId].color }}
                          >
                            <PlaceIcon size={22} aria-hidden="true" />
                            <strong>{place.rank}</strong>
                          </span>
                          <span className="map-city-content">
                            <span className="map-city-title">{place.name}</span>
                            <span className="map-city-meta">
                              <Star size={12} fill="currentColor" aria-hidden="true" />
                              {place.rating}
                              <small>{place.reviews}</small>
                            </span>
                            <span className="map-city-tag">{place.address}</span>
                          </span>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <PlaceDetails
            place={selectedPlace}
            categoryId={selectedCategory}
            onRemove={handleRemoveCustomMarker}
          />
        )}
      </aside>
      ) : null}
    </section>
  );
}

export default MapPage;
