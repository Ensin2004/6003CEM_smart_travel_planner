/**
 * Comparison service.
 * Business scoring converts selected places into a clear recommendation result.
 */

/**
 * Extracts and normalizes open state text from an item.
 * @param {Object} item - Place item with openState or hours fields
 * @returns {string} Lowercase normalized open state text
 */
const getOpenStateText = (item) => String(item.openState || item.hours || '').toLowerCase();

/**
 * Checks if an item has a known price value.
 * @param {Object} item - Place item with price or priceValue fields
 * @returns {boolean} True if price information is available
 */
const hasKnownPrice = (item) => Boolean(item.price || Number.isFinite(Number(item.priceValue)));

/**
 * Determines if a place is open or likely available based on hours text.
 * @param {Object} item - Place item with openState or hours fields
 * @returns {boolean} True if the place appears to be open or available
 */
const isOpenOrLikelyAvailable = (item) => {
  const openText = getOpenStateText(item);

  // Marked as closed - not available
  if (openText.includes('closed')) {
    return false;
  }

  // Open, 24-hour, or available - likely accessible
  return openText.includes('open') || openText.includes('24') || openText.includes('available');
};

/**
 * Calculates price score based on price value or textual description.
 * Lower prices receive higher scores.
 * 
 * @param {Object} item - Place item with price or priceValue fields
 * @returns {number} Price score between 0 and 18
 */
const getPriceScore = (item) => {
  // Numeric price - scale inversely (lower price = higher score)
  if (Number.isFinite(Number(item.priceValue))) {
    return Math.max(0, 18 - Math.min(Number(item.priceValue) / 10, 18));
  }

  const priceText = String(item.price || '').toLowerCase();

  // No price information - neutral score
  if (!priceText) return 6;
  // Free - maximum price score
  if (priceText.includes('free')) return 18;
  // Has currency symbols - indicates price available
  if (priceText.includes('$') || priceText.includes('rm') || priceText.includes('myr')) return 13;
  // Price unavailable or unknown - low score
  if (priceText.includes('unavailable') || priceText.includes('unknown')) return 4;

  // Default moderate score for other cases
  return 10;
};

/**
 * Calculates overall score for a place item.
 * Combines rating, review count, price, and hours availability.
 * Score range: 0-100.
 * 
 * @param {Object} item - Place item with rating, reviewCount, price, and hours
 * @returns {number} Overall score between 0 and 100
 */
const getItemScore = (item) => {
  // Rating score: up to 65 points (5 stars * 13 points per star)
  const ratingScore = Math.min((Number(item.rating) || 0) * 13, 65);
  
  // Review count score: up to 21 points (logarithmic scaling)
  const reviewScore = Math.min(Math.log10((Number(item.reviewCount) || 0) + 1) * 7, 21);
  
  // Price score: up to 18 points (lower price = higher score)
  const priceScore = getPriceScore(item);
  
  // Hours availability score: 10 if open, 4 if hours exist but closed, 0 if no hours
  const hoursScore = isOpenOrLikelyAvailable(item) ? 10 : getOpenStateText(item) ? 4 : 0;

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(Math.round(ratingScore + reviewScore + priceScore + hoursScore), 100));
};

/**
 * Generates strengths list for a place item.
 * Highlights positive attributes for display in recommendations.
 * 
 * @param {Object} item - Place item with rating, reviewCount, hours, and price
 * @returns {Array<string>} List of strength descriptions
 */
const getStrengths = (item) => {
  const strengths = [];

  // High rating is a strength
  if (Number(item.rating)) {
    strengths.push(`${Number(item.rating).toFixed(1)} star rating`);
  }

  // Many reviews indicate popularity
  if (Number(item.reviewCount)) {
    strengths.push(`${Number(item.reviewCount).toLocaleString('en-US')} reviews`);
  }

  // Favorable hours availability
  if (isOpenOrLikelyAvailable(item)) {
    strengths.push('available hours look favorable');
  }

  // Price information availability
  if (hasKnownPrice(item)) {
    strengths.push('price information is visible');
  }

  return strengths;
};

/**
 * Generates cautions list for a place item.
 * Highlights missing or concerning information.
 * 
 * @param {Object} item - Place item with rating, price, hours, and openState
 * @returns {Array<string>} List of caution descriptions
 */
const getCautions = (item) => {
  const cautions = [];

  // Missing rating information
  if (!Number(item.rating)) cautions.push('rating is missing');
  
  // Missing price information
  if (!hasKnownPrice(item)) cautions.push('price is unclear');
  
  // Missing hours information
  if (!item.hours && !item.openState) cautions.push('working hours are unavailable');
  
  // Marked as closed
  if (getOpenStateText(item).includes('closed')) cautions.push('currently marked closed');

  return cautions;
};

/**
 * Builds a compared item object with normalized fields and computed scores.
 * 
 * @param {Object} item - Raw item from request
 * @returns {Object} Normalized item with scores and strengths/cautions
 */
const buildComparedItem = (item) => ({
  id: item.id || item.name,
  name: item.name,
  category: item.category || 'Place',
  source: item.source || 'comparison',
  rating: Number(item.rating) || null,
  reviewCount: Number(item.reviewCount) || 0,
  price: item.price || 'Price unavailable',
  hours: item.hours || item.openState || 'Working hours unavailable',
  address: item.address || 'Address unavailable',
  score: getItemScore(item),
  strengths: getStrengths(item),
  cautions: getCautions(item),
});

/**
 * Generates a recommendation from a list of compared items.
 * Sorts by score and returns the best pick with supporting context.
 * 
 * @param {Object} params - Recommendation parameters
 * @param {Array} params.items - Array of items to compare
 * @param {Object} params.context - Context information (page, destination)
 * @returns {Object} Recommendation result with best pick and summary
 */
const getRecommendation = ({ items, context = {} }) => {
  // Build and sort items by score descending
  const comparedItems = items.map(buildComparedItem).sort((firstItem, secondItem) => secondItem.score - firstItem.score);
  
  const bestPick = comparedItems[0];
  const secondPick = comparedItems[1];
  
  // Generate lead reason from top 3 strengths
  const leadReason = bestPick.strengths.length
    ? bestPick.strengths.slice(0, 3).join(', ')
    : 'it has the strongest overall balance from the selected data';
  
  // First caution as a warning
  const cautionText = bestPick.cautions.length ? bestPick.cautions[0] : 'confirm live details before booking or visiting';

  return {
    available: true,
    context: {
      page: context.page || '',
      destination: context.destination || '',
    },
    bestPick: {
      id: bestPick.id,
      name: bestPick.name,
      score: bestPick.score,
      reason: `${bestPick.name} is the best fit because ${leadReason}.`,
      caution: cautionText,
    },
    // Summary comparing first and second choices
    summary: secondPick
      ? `${bestPick.name} leads ${secondPick.name} by ${Math.max(bestPick.score - secondPick.score, 0)} point${bestPick.score - secondPick.score === 1 ? '' : 's'} based on rating, reviews, price clarity, and hours.`
      : `${bestPick.name} is the strongest selected option.`,
    items: comparedItems,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getRecommendation,
};