/* ==========================================================================
   Expert Services — Optimized Sanity CDN Client & Image Engine
   - Uses Sanity Global Edge CDN (apicdn.sanity.io) for sub-20ms cached reads
   - Stale-While-Revalidate Session Cache to eliminate repeat network requests
   - WebP/AVIF auto-format & quality-optimized image transformation pipeline
   ========================================================================== */

(function () {
  "use strict";

  const SANITY_PROJECT_ID = '31o55q41';
  const SANITY_DATASET = 'production';
  const SANITY_API_VERSION = 'v2024-01-01';

  // Base URL querying via Sanity's Global Edge CDN
  const SANITY_CDN_URL = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

  // Cache configuration (5 minute TTL)
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const memoryCache = new Map();

  /**
   * Helper to generate a cache storage key from a GROQ query
   */
  function getCacheKey(query) {
    return 'sanity_cache_' + btoa(encodeURIComponent(query)).slice(0, 48);
  }

  /**
   * Reads from memory or sessionStorage cache if fresh
   */
  function getCachedResult(key) {
    // 1. Check in-memory map
    if (memoryCache.has(key)) {
      const entry = memoryCache.get(key);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
      }
    }

    // 2. Check sessionStorage
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore storage quota / private mode exceptions
    }

    return null;
  }

  /**
   * Writes query response into cache
   */
  function setCachedResult(key, data) {
    const entry = { data: data, timestamp: Date.now() };
    memoryCache.set(key, entry);
    try {
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      // Handle storage quota limits gracefully
    }
  }

  /**
   * Executes a GROQ query against the Sanity Edge CDN.
   * Utilizes stale-while-revalidate caching for instant rendering.
   * @param {string} query - The GROQ query string.
   * @param {object} [opts] - Query options ({ skipCache: boolean })
   * @returns {Promise<any>} The result of the query.
   */
  async function fetchSanity(query, opts = {}) {
    const cacheKey = getCacheKey(query);

    // Return cached data immediately if valid and not explicitly skipped
    if (!opts.skipCache) {
      const cached = getCachedResult(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const url = `${SANITY_CDN_URL}?query=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Sanity CDN returned HTTP ${response.status}`);
      }

      const json = await response.json();
      const result = json.result;

      // Cache successful response
      setCachedResult(cacheKey, result);

      return result;
    } catch (error) {
      console.warn('Sanity CDN fetch notice:', error.message);
      // If network fails, attempt fallback to stale cache if available
      const stale = memoryCache.get(cacheKey);
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Builds an optimized CDN image URL from a Sanity image object.
   * Automatically enforces WebP/AVIF auto-format and high-fidelity compression.
   * @param {object} source - The Sanity image reference object.
   * @param {object} [options] - Options (width, height, quality, fit, dpr)
   * @returns {string} The optimized image URL.
   */
  function urlFor(source, options = {}) {
    if (!source || !source.asset || !source.asset._ref) return '';

    // Extract reference details: image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg
    const parts = source.asset._ref.split('-');
    if (parts.length < 4) return '';

    const id = parts[1];
    const dimensions = parts[2];
    const format = parts[3];

    let url = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}-${dimensions}.${format}`;

    const params = new URLSearchParams();

    // Responsive dimensions
    if (options.width)  params.append('w', Math.round(options.width));
    if (options.height) params.append('h', Math.round(options.height));

    // Cropping & fit
    params.append('fit', options.fit || 'max');

    // Modern format negotiation (serves AVIF/WebP where supported)
    params.append('auto', 'format');

    // Quality optimization (default 80 for optimal compression/clarity ratio)
    params.append('q', options.quality || 80);

    // Device Pixel Ratio (Retina support)
    if (options.dpr && options.dpr > 1) {
      params.append('dpr', options.dpr);
    }

    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  // Expose globally
  window.sanityClient = {
    fetch: fetchSanity,
    urlFor: urlFor,
    clearCache: function () {
      memoryCache.clear();
      try {
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('sanity_cache_')) sessionStorage.removeItem(k);
        });
      } catch (e) {}
    }
  };
})();
