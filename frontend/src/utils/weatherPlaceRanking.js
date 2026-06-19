import { getWeatherPlaceRanking } from '../api/aiAssistantApi';

const getCandidateId = (item = {}, category = '', index = 0) =>
  String(item.id || item.placeId || item.dataId || item.externalId || `${category}-${item.name || item.title || index}`)
    .trim()
    .slice(0, 160);

const toCandidate = (item = {}, category = '', index = 0) => ({
  id: getCandidateId(item, category, index),
  name: String(item.name || item.title || item.displayName || 'Unnamed place').trim().slice(0, 180),
  category: String(item.category || item.type || category || '').trim().slice(0, 60),
  address: String(item.address || item.destinationName || item.displayName || '').trim().slice(0, 240),
  summary: String(item.summary || item.description || item.bestFor || '').trim().slice(0, 320),
  rating: Number(item.rating) || undefined,
  price: String(item.priceDetail?.display || item.price || '').trim().slice(0, 80),
  hours: String(item.hours || item.hoursSummary || item.openState || '').trim().slice(0, 120),
});

const getRatingText = (item = {}) => {
  const rating = Number(item.rating || 0);
  const reviews = Number(item.reviewCount || item.reviews || 0);

  if (!rating) return 'Rating unavailable';
  return `${rating.toFixed(1)} stars${reviews ? ` (${reviews.toLocaleString()} reviews)` : ''}`;
};

const getFallbackReason = (item = {}) =>
  item.summary ||
  item.description ||
  item.address ||
  item.category ||
  'Recommended from the loaded place results.';

export const rankPlacesForWeather = async ({
  items = [],
  weather,
  trip = {},
  day = {},
  category = '',
}) => {
  const sourceItems = items.slice(0, 40);

  if (!sourceItems.length) {
    return {
      available: false,
      summary: 'Search results are needed before weather-aware recommendations can be generated.',
      picks: [],
      items,
    };
  }

  const itemsWithIds = sourceItems.map((item, index) => ({
    ...item,
    weatherCandidateId: getCandidateId(item, category, index),
  }));

  const response = await getWeatherPlaceRanking({
    weather: {
      condition: weather?.condition || '',
      mode: weather?.mode || '',
      temperature: weather?.temperature?.mean || weather?.temperature?.max || '',
      precipitation: weather?.precipitation?.probability ?? weather?.precipitation?.amountMm ?? '',
      wind: weather?.windSpeed?.max || '',
      travelTip: weather?.travelTip || '',
      placeTips: weather?.placeTips || [],
    },
    trip,
    day,
    category,
    candidates: itemsWithIds.map((item, index) => toCandidate({
      ...item,
      id: item.weatherCandidateId,
    }, category, index)),
  });

  const ranking = response.data?.data?.ranking;
  const rankingMap = new Map(
    (ranking?.rankedPlaces || []).map((place, index) => [
      place.id,
      {
        index,
        score: Number(place.score) || 0,
        reason: place.reason || ranking.summary || '',
      },
    ])
  );

  if (!ranking?.available || !rankingMap.size) {
    return {
      available: false,
      provider: ranking?.provider,
      summary: ranking?.summary || 'Weather-aware AI recommendations are unavailable right now.',
      picks: sourceItems.slice(0, 3).map((item) => ({
        itemName: item.name || item.title || 'Unnamed place',
        reason: getFallbackReason(item),
        bestFor: 'loaded place result',
        score: Number(item.rating || 0) * 10,
      })),
      items,
    };
  }

  const rankedSourceItems = [...itemsWithIds]
    .map((item, index) => {
      const ranked = rankingMap.get(item.weatherCandidateId);
      return {
        ...item,
        weatherReason: ranked?.reason || ranking.summary,
        weatherScore: ranked?.score ?? Number(item.rating || 0),
        weatherRank: ranked?.index ?? index + itemsWithIds.length,
      };
    })
    .sort((firstItem, secondItem) =>
      Number(firstItem.weatherRank || 0) - Number(secondItem.weatherRank || 0)
      || Number(secondItem.weatherScore || 0) - Number(firstItem.weatherScore || 0)
    );

  const rankedIds = new Set(rankedSourceItems.map((item) => item.weatherCandidateId));
  const rankedItems = [
    ...rankedSourceItems,
    ...items.slice(40).filter((item, index) => !rankedIds.has(getCandidateId(item, category, index + 40))),
  ];

  return {
    available: true,
    provider: ranking.provider,
    recommendationMode: 'weather-ai',
    summary: ranking.summary || 'Places are ranked for the selected weather.',
    picks: rankedSourceItems.slice(0, 5).map((item) => ({
      itemName: item.name || item.title || 'Unnamed place',
      reason: item.weatherReason || getFallbackReason(item),
      bestFor: `${category || 'place'} weather fit`,
      score: Math.round(Number(item.weatherScore || 0)),
      meta: getRatingText(item),
    })),
    items: rankedItems,
    lastUpdated: ranking.lastUpdated,
  };
};

export const buildWeatherRankingRequestKey = ({ view, destination, date, weather, items = [] }) =>
  JSON.stringify({
    view,
    destination,
    date,
    weather: weather?.available ? weather.condition : weather?.message || '',
    items: items
      .slice(0, 20)
      .map((item, index) => getCandidateId(item, view, index))
      .sort(),
  });
