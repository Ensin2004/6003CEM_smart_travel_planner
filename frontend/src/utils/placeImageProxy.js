/**
 * Converts Google place image URLs to the backend proxy so browser referrers do not break them.
 */
import { apiBaseURL } from '../api/axiosClient';

// Maintains a set of image hostnames that require proxying through the backend
const proxiedImageHosts = new Set([
  'lh3.googleusercontent.com',
  'streetviewpixels-pa.googleapis.com',
  'serpapi.com',
]);

// Processes an image URL by checking if proxying is needed and returns either proxied or original URL
export const getPlaceImageSrc = (imageUrl = '') => {
  // Returns empty string immediately if no image URL is provided
  if (!imageUrl) return '';

  try {
    const parsedUrl = new URL(imageUrl);
    // Checks if the URL uses HTTPS and belongs to a host that requires proxying
    if (parsedUrl.protocol === 'https:' && proxiedImageHosts.has(parsedUrl.hostname)) {
      // Constructs a proxied URL through the backend image endpoint
      return `${apiBaseURL}/explore/image?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    // Returns the original URL if URL parsing fails
    return imageUrl;
  }

  // Returns the original URL for hosts that do not require proxying
  return imageUrl;
};
