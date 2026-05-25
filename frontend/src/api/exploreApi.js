import axiosClient from './axiosClient';

export const searchWeather = ({ destination, date, latitude, longitude, locationLabel }) =>
  axiosClient.get('/explore/weather', {
    params: {
      destination,
      date,
      latitude,
      longitude,
      locationLabel,
    },
  });

export const searchAttractions = (destination) =>
  axiosClient.get('/explore/attractions', { params: { destination } });

export const searchHotels = ({ destination, country, state, roomType, start }) =>
  axiosClient.get('/explore/hotels', {
    params: {
      destination,
      country,
      state,
      roomType,
      start,
    },
  });

export const searchRestaurants = ({ destination, country, state, foodCategory, start }) =>
  axiosClient.get('/explore/restaurants', {
    params: {
      destination,
      country,
      state,
      foodCategory,
      start,
    },
  });

export const getAiRecommendations = ({ view, destination, date, weather, items }) =>
  axiosClient.post('/explore/ai-recommendations', {
    view,
    destination,
    date,
    weather,
    items,
  });
