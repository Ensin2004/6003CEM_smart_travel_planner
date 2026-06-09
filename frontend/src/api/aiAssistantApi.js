/**
 * AI Assistant Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

export const sendAiChatPrompt = ({ prompt, page }) =>
  axiosClient.post('/ai/chat', {
    prompt,
    page,
  });

export const getTripAiRecommendations = ({ prompt, trip, plannedPlaces, history }) =>
  axiosClient.post('/ai/trip-recommendations', {
    prompt,
    trip,
    plannedPlaces,
    history,
  });
