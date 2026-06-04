/**
 * Converts Google place image URLs to the backend proxy so browser referrers do not break them.
 */
import { apiBaseURL } from '../api/axiosClient';

const proxiedImageHosts = new Set([
  'lh3.googleusercontent.com',
  'streetviewpixels-pa.googleapis.com',
  'serpapi.com',
]);

export const getPlaceImageSrc = (imageUrl = '') => {
  if (!imageUrl) return '';

  try {
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol === 'https:' && proxiedImageHosts.has(parsedUrl.hostname)) {
      return `${apiBaseURL}/explore/image?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
};
