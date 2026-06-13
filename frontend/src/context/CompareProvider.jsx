/**
 * Compare provider.
 * Shared state keeps selected places available across trip, explore, guide, and map pages.
 */
import { createContext, useCallback, useMemo, useState } from 'react';

const maxCompareItems = 3;
const CompareContext = createContext(null);

const getStableId = (item = {}) =>
  String(item.compareId || item.id || item._id || item.placeId || item.dataId || item.name || '').toLowerCase();

const normalizeCompareItem = (item = {}) => ({
  id: getStableId(item) || `compare-${Date.now()}`,
  name: item.name || item.title || item.destination || 'Unnamed place',
  category: item.category || item.type || item.sourceLabel || 'Place',
  source: item.source || 'travel-planner',
  rating: Number(item.rating) || null,
  reviewCount: Number(item.reviewCount ?? item.reviews) || 0,
  price: item.price || item.priceText || item.priceDetail?.display || item.budgetText || 'Price unavailable',
  priceValue: Number.isFinite(Number(item.priceValue)) ? Number(item.priceValue) : null,
  hours: item.hours || item.openState || item.workingHour || 'Working hours unavailable',
  openState: item.openState || item.hours || '',
  address: item.address || item.displayName || [item.destination, item.country].filter(Boolean).join(', ') || 'Address unavailable',
  imageUrl: item.imageUrl || item.imageUrls?.[0] || '',
});

export function CompareProvider({ children }) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState('');

  const addItem = useCallback((item) => {
    const normalizedItem = normalizeCompareItem(item);

    setItems((currentItems) => {
      if (currentItems.some((currentItem) => currentItem.id === normalizedItem.id)) {
        setNotice(`${normalizedItem.name} is already selected.`);
        return currentItems;
      }

      if (currentItems.length >= maxCompareItems) {
        setNotice(`Compare up to ${maxCompareItems} places at a time.`);
        return currentItems;
      }

      setNotice(`${normalizedItem.name} added to compare.`);
      return [...currentItems, normalizedItem];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setNotice('');
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
    setNotice('');
  }, []);

  const isSelected = useCallback((item) => {
    const itemId = getStableId(item);
    return items.some((selectedItem) => selectedItem.id === itemId);
  }, [items]);

  const value = useMemo(
    () => ({
      addItem,
      clearItems,
      isSelected,
      items,
      maxCompareItems,
      notice,
      removeItem,
    }),
    [addItem, clearItems, isSelected, items, notice, removeItem]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export default CompareContext;
