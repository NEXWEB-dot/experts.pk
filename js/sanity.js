/* ==========================================================================
   Expert Services — Optimized Sanity CDN Client & Image Engine
   - Uses Sanity Global Edge CDN (apicdn.sanity.io) for cached reads
   - Bounded Session Cache to eliminate repeat network requests
   - WebP/AVIF auto-format & quality-optimized image transformation pipeline
   ========================================================================== */

(function () {
  "use strict";

  const SANITY_PROJECT_ID = '31o55q41';
  const SANITY_DATASET = 'production';
  const SANITY_API_VERSION = 'v2024-01-01';

  // Base URL querying via Sanity's Global Edge CDN
  const SANITY_CDN_URL = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

  const CACHE_TTL_MS = 5 * 60 * 1000;
  const MAX_STALE_MS = 60 * 60 * 1000;
  const memoryCache = new Map();
  const pending = new Map();
  let generation = 0;
  async function fetchSanity(query, opts = {}) {
    const params = new URLSearchParams({query, perspective: 'published'});
    Object.keys(opts.params || {}).sort().forEach(k => params.set('$' + k, JSON.stringify(opts.params[k])));
    const key = 'sanity_cache_v2_' + SANITY_CDN_URL + '?' + params;
    let cached = memoryCache.get(key);
    if (!cached) { try { cached = JSON.parse(sessionStorage.getItem(key)); } catch (_) {} }
    const age = cached && Date.now() - cached.timestamp;
    if (!opts.skipCache && cached && age >= 0 && age < CACHE_TTL_MS) return cached.data;
    if (pending.has(key)) return pending.get(key);
    const currentGeneration = generation;
    const task = (async () => {
      try {
        const response = await fetch(SANITY_CDN_URL + '?' + params, {headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(10000)});
        if (!response.ok) throw new Error('Sanity HTTP ' + response.status);
        const json = await response.json();
        if (!Object.prototype.hasOwnProperty.call(json, 'result')) throw new Error('Invalid response');
        if (generation === currentGeneration) {
          const entry = {data: json.result, timestamp: Date.now()};
          if (memoryCache.size >= 100) memoryCache.delete(memoryCache.keys().next().value);
          memoryCache.set(key, entry);
          try {
            const keys = Object.keys(sessionStorage).filter(k => k.startsWith('sanity_cache_'));
            keys.forEach(k => {
              try { const old = JSON.parse(sessionStorage.getItem(k));
                if (!k.startsWith('sanity_cache_v2_') || !old || Date.now() - old.timestamp >= MAX_STALE_MS) sessionStorage.removeItem(k);
              } catch (_) { sessionStorage.removeItem(k); }
            });
            if (keys.length >= 100) sessionStorage.removeItem(keys[0]);
            sessionStorage.setItem(key, JSON.stringify(entry));
          } catch (_) {}
        }
        return json.result;
      } catch (error) {
        console.warn('Sanity fetch failed:', error.message);
        if (!opts.skipCache && cached && age >= 0 && age < MAX_STALE_MS) return cached.data;
        return null;
      } finally { pending.delete(key); }
    })();
    pending.set(key, task);
    return task;
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
    if (!/^image-[a-zA-Z0-9]+-\d+x\d+-[a-zA-Z0-9]+$/.test(source.asset._ref)) return '';

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
      generation++;
      memoryCache.clear();
      try {
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('sanity_cache_')) sessionStorage.removeItem(k);
        });
      } catch (e) {}
    }
  };
})();
