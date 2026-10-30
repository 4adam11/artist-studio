// Field definitions for the two kinds of content the artist manages.
export const CONTENT_TYPES = {
  artworks: {
    label: 'Artworks',
    singular: 'artwork',
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 120 },
      { name: 'category', label: 'Category', required: true, maxLength: 60, suggestions: true },
      { name: 'description', label: 'Short description', type: 'textarea', required: true, maxLength: 500 },
      { name: 'story', label: 'Story behind the piece', type: 'textarea', maxLength: 2000 },
      { name: 'image', label: 'Image', type: 'image', required: true },
      { name: 'featured', label: 'Feature on the home page', type: 'checkbox' }
    ]
  },
  products: {
    label: 'Shop products',
    singular: 'product',
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 120 },
      { name: 'category', label: 'Category', required: true, maxLength: 60, suggestions: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true, maxLength: 1000 },
      { name: 'price', label: 'Price', type: 'number', required: true, min: 0.5, step: 0.01 },
      { name: 'stock', label: 'How many are available', type: 'number', required: true, min: 0, step: 1 },
      { name: 'image', label: 'Image', type: 'image', required: true }
    ]
  }
};
