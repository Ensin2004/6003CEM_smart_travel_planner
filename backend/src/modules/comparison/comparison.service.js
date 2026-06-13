/**
 * Comparison service.
 * Business scoring converts selected places into a clear recommendation result.
 */
const getOpenStateText = (item) => String(item.openState || item.hours || '').toLowerCase();

const hasKnownPrice = (item) => Boolean(item.price || Number.isFinite(Number(item.priceValue)));

const isOpenOrLikelyAvailable = (item) => {
  const openText = getOpenStateText(item);

  if (openText.includes('closed')) {
    return false;
  }

  return openText.includes('open') || openText.includes('24') || openText.includes('available');
};

const getPriceScore = (item) => {
  if (Number.isFinite(Number(item.priceValue))) {
    return Math.max(0, 18 - Math.min(Number(item.priceValue) / 10, 18));
  }

  const priceText = String(item.price || '').toLowerCase();

  if (!priceText) return 6;
  if (priceText.includes('free')) return 18;
  if (priceText.includes('$') || priceText.includes('rm') || priceText.includes('myr')) return 13;
  if (priceText.includes('unavailable') || priceText.includes('unknown')) return 4;

  return 10;
};

const getItemScore = (item) => {
  const ratingScore = Math.min((Number(item.rating) || 0) * 13, 65);
  const reviewScore = Math.min(Math.log10((Number(item.reviewCount) || 0) + 1) * 7, 21);
  const priceScore = getPriceScore(item);
  const hoursScore = isOpenOrLikelyAvailable(item) ? 10 : getOpenStateText(item) ? 4 : 0;

  return Math.max(0, Math.min(Math.round(ratingScore + reviewScore + priceScore + hoursScore), 100));
};

const getStrengths = (item) => {
  const strengths = [];

  if (Number(item.rating)) {
    strengths.push(`${Number(item.rating).toFixed(1)} star rating`);
  }

  if (Number(item.reviewCount)) {
    strengths.push(`${Number(item.reviewCount).toLocaleString('en-US')} reviews`);
  }

  if (isOpenOrLikelyAvailable(item)) {
    strengths.push('available hours look favorable');
  }

  if (hasKnownPrice(item)) {
    strengths.push('price information is visible');
  }

  return strengths;
};

const getCautions = (item) => {
  const cautions = [];

  if (!Number(item.rating)) cautions.push('rating is missing');
  if (!hasKnownPrice(item)) cautions.push('price is unclear');
  if (!item.hours && !item.openState) cautions.push('working hours are unavailable');
  if (getOpenStateText(item).includes('closed')) cautions.push('currently marked closed');

  return cautions;
};

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

const getRecommendation = ({ items, context = {} }) => {
  const comparedItems = items.map(buildComparedItem).sort((firstItem, secondItem) => secondItem.score - firstItem.score);
  const bestPick = comparedItems[0];
  const secondPick = comparedItems[1];
  const leadReason = bestPick.strengths.length
    ? bestPick.strengths.slice(0, 3).join(', ')
    : 'it has the strongest overall balance from the selected data';
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
