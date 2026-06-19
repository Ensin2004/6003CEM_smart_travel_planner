/**
 * Compare provider.
 * Shared state keeps selected places available across trip, explore, guide, and map pages.
 */
import { createContext, useCallback, useMemo, useState } from 'react';

// Maximum number of items allowed in the comparison basket
const maxCompareItems = 3;

// Creates a context for comparing items across the application
const CompareContext = createContext(null);

// Generates a stable identifier for an item using available id fields
const getStableId = (item = {}) =>
  String(item.compareId || item.id || item._id || item.placeId || item.dataId || item.name || '').toLowerCase();

// Normalizes various item shapes into a consistent comparison item format
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

  // Adds an item to the comparison basket with duplicate and limit checks
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

  // Removes an item from the comparison basket by its id
  const removeItem = useCallback((itemId) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setNotice('');
  }, []);

  // Clears all items from the comparison basket
  const clearItems = useCallback(() => {
    setItems([]);
    setNotice('');
  }, []);

  // Checks whether a given item is already selected in the comparison basket
  const isSelected = useCallback((item) => {
    const itemId = getStableId(item);
    return items.some((selectedItem) => selectedItem.id === itemId);
  }, [items]);

  // Memoized context value containing comparison state and actions
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
