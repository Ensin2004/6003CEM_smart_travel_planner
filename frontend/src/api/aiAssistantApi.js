/**
 * AI Assistant Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Sends a chat prompt to the AI assistant along with the current page context
export const sendAiChatPrompt = ({ prompt, page }) =>
  axiosClient.post('/ai/chat', {
    prompt,
    page,
  });

// Requests AI-powered trip recommendations based on trip details, planned places, and user history
export const getTripAiRecommendations = ({ prompt, trip, plannedPlaces, history }) =>
  axiosClient.post('/ai/trip-recommendations', {
    prompt,
    trip,
    plannedPlaces,
    history,
  });

export const getWeatherPlaceRanking = ({ weather, trip, day, category, candidates }) =>
  axiosClient.post('/ai/weather-place-ranking', {
    weather,
    trip,
    day,
    category,
    candidates,
  });
  
