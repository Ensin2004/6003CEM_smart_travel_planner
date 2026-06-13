/**
 * Comparison API module.
 * API functions keep the HTTP contract separate from shared compare UI state.
 */
import axiosClient from './axiosClient';

export const getComparisonRecommendation = ({ items, context }) =>
  axiosClient.post('/comparison/recommendation', {
    items,
    context,
  });
