/* ==========================================================================
   Expert Services — Sanity CMS Client & Helpers
   ========================================================================== */

const SANITY_PROJECT_ID = '31o55q41';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = 'v2024-01-01';

// Base URL for querying Sanity via the CDN
const SANITY_API_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

/**
 * Executes a GROQ query against the Sanity API.
 * @param {string} query - The GROQ query string.
 * @returns {Promise<any>} The result of the query.
 */
async function fetchSanity(query) {
  try {
    const url = `${SANITY_API_URL}?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching from Sanity:', error);
    return null;
  }
}

/**
 * Builds an image URL from a Sanity image object.
 * @param {object} source - The Sanity image object.
 * @param {object} options - Options like width, height, fit.
 * @returns {string} The optimized image URL.
 */
function urlFor(source, options = {}) {
  if (!source || !source.asset || !source.asset._ref) return '';
  
  // Example ref: image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg
  const [, id, dimensions, format] = source.asset._ref.split('-');
  let url = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}-${dimensions}.${format}`;
  
  const params = new URLSearchParams();
  if (options.width) params.append('w', options.width);
  if (options.height) params.append('h', options.height);
  if (options.fit) params.append('fit', options.fit);
  else params.append('fit', 'max');
  
  params.append('auto', 'format');
  
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

window.sanityClient = {
  fetch: fetchSanity,
  urlFor: urlFor
};
