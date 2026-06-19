/**
 * Travel Tools module.
 * Exports and local helpers keep related behavior in a single module.
 */
const { priorityLevels } = require('./travelTools.constants');

// Destructure priority levels for easy access
const [highPriority, mediumPriority, lowPriority] = priorityLevels;

// System packing templates with pre-defined item lists
const templates = [
  {
    key: 'beach-trip',
    title: 'Beach Trip',
    description: 'Sunny-day essentials for swimming, relaxing, and staying protected.',
    items: [
      ['Swimwear', 'clothes', mediumPriority, 2],
      ['Sunscreen', 'toiletries', highPriority, 1],
      ['Beach towel', 'travel essentials', mediumPriority, 1],
      ['Sunglasses', 'travel essentials', lowPriority, 1],
      ['Waterproof phone pouch', 'electronics', lowPriority, 1],
    ],
  },
  {
    key: 'business-trip',
    title: 'Business Trip',
    description: 'Work-ready items for meetings, travel days, and documents.',
    items: [
      ['Formal shirts', 'clothes', mediumPriority, 3],
      ['Laptop charger', 'electronics', highPriority, 1],
      ['Business documents', 'documents', highPriority, 1],
      ['Blazer', 'clothes', mediumPriority, 1],
      ['Portable power bank', 'electronics', lowPriority, 1],
    ],
  },
  {
    key: 'hiking-trip',
    title: 'Hiking Trip',
    description: 'Trail essentials for outdoor safety and comfort.',
    items: [
      ['Hiking shoes', 'clothes', highPriority, 1],
      ['Rain jacket', 'clothes', mediumPriority, 1],
      ['First aid kit', 'medicine', highPriority, 1],
      ['Trail snacks', 'food', mediumPriority, 4],
      ['Reusable water bottle', 'travel essentials', highPriority, 1],
    ],
  },
  {
    key: 'family-trip',
    title: 'Family Trip',
    description: 'Shared family basics for smoother group travel.',
    items: [
      ['Family passports', 'documents', highPriority, 1],
      ['Children clothes set', 'clothes', mediumPriority, 5],
      ['Medicine pouch', 'medicine', highPriority, 1],
      ['Snacks', 'food', mediumPriority, 6],
      ['Travel games', 'travel essentials', lowPriority, 2],
    ],
  },
  {
    key: 'overseas-trip',
    title: 'Overseas Trip',
    description: 'International travel essentials for documents, adapters, and comfort.',
    items: [
      ['Passport', 'documents', highPriority, 1],
      ['Travel adapter', 'electronics', highPriority, 1],
      ['Travel insurance', 'documents', mediumPriority, 1],
      ['Foreign currency card', 'travel essentials', mediumPriority, 1],
      ['Prescription medicine', 'medicine', highPriority, 1],
    ],
  },
];

// Map Template Items transforms source data into the shape required nearby.
const mapTemplateItems = (items) =>
  items.map(([name, category, priority, quantity]) => ({
    name,
    category,
    priority,
    quantity,
    isPacked: false,
  }));

// Transform templates into final format with normalized items
const packingTemplates = templates.map((template) => ({
  ...template,
  items: mapTemplateItems(template.items),
}));

// Export the templates array
module.exports = packingTemplates;