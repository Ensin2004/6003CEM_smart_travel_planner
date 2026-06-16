/**
 * Comparison API module.
 * API functions keep the HTTP contract separate from shared compare UI state.
 */
import axiosClient from './axiosClient';

// Requests AI-generated recommendations for comparing items within a given context
export const getComparisonRecommendation = ({ items, context }) =>
  axiosClient.post('/comparison/recommendation', {
    items,
    context,
  });
  