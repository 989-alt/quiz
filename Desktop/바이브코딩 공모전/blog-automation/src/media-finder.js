import { createClient } from 'pexels';

// In-memory dedup set — prevents same photo ID across calls in one session
const usedPhotoIds = new Set();

/**
 * Find diverse, copyright-safe images for a topic.
 *
 * Sources (in order of preference):
 *  1. Google Custom Search API — CC-licensed images (if GOOGLE_CSE_KEY + GOOGLE_CSE_CX set)
 *  2. Pexels API — royalty-free, with randomized page to avoid duplicates
 *
 * @param {string} topic
 * @param {{keywords: string[]}} researchData
 * @param {object} [options]
 * @param {number} [options.count=4]
 * @returns {Promise<Array<{url, alt, photographer, photographerUrl, sourceUrl, sourceName}>>}
 */
export async function findImages(topic, researchData, { count = 4 } = {}) {
  const images = [];

  // Try Google Custom Search first (CC-licensed, more diverse)
  if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX) {
    const gcsImages = await searchGoogleImages(topic, researchData, count);
    images.push(...gcsImages);
  }

  // Fill remaining slots with Pexels (diverse queries + random pages)
  if (images.length < count) {
    const needed = count - images.length;
    const pexelsImages = await searchPexels(topic, researchData, needed);
    images.push(...pexelsImages);
  }

  console.log(`[Media] Total images found: ${images.length}`);
  return images.slice(0, count);
}

// ──────────────────────────────────────────────
// Google Custom Search (Creative Commons only)
// ──────────────────────────────────────────────

async function searchGoogleImages(topic, researchData, count) {
  const apiKey = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  const keywords = researchData?.keywords || [];

  // Use different keyword combos for variety
  const queries = buildQueryVariants(topic, keywords);
  const images = [];

  for (const query of queries) {
    if (images.length >= count) break;

    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query);
      url.searchParams.set('searchType', 'image');
      url.searchParams.set('rights', 'cc_publicdomain,cc_attribute,cc_sharealike');
      url.searchParams.set('imgSize', 'large');
      url.searchParams.set('num', String(Math.min(count - images.length + 2, 10)));

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.items) {
        for (const item of data.items) {
          if (images.length >= count) break;
          // Deduplicate by image URL
          if (usedPhotoIds.has(item.link)) continue;

          const license = item.pagemap?.metatags?.[0]?.['og:image'] || item.link;
          usedPhotoIds.add(item.link);

          images.push({
            url: item.link,
            alt: item.title || topic,
            photographer: item.displayLink || 'Unknown',
            photographerUrl: item.image?.contextLink || item.displayLink,
            sourceUrl: item.image?.contextLink || item.link,
            sourceName: 'Google (CC License)',
          });
        }
      }
    } catch (err) {
      console.warn(`[Media] Google CSE error for "${query}": ${err.message}`);
    }
  }

  if (images.length > 0) {
    console.log(`[Media] Google CSE: found ${images.length} CC-licensed images`);
  }
  return images;
}

// ──────────────────────────────────────────────
// Pexels (with dedup + random page)
// ──────────────────────────────────────────────

async function searchPexels(topic, researchData, count) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[Media] PEXELS_API_KEY not set');
    return [];
  }

  const client = createClient(apiKey);
  const keywords = researchData?.keywords || [];
  const queries = buildQueryVariants(topic, keywords);
  const images = [];

  for (const query of queries) {
    if (images.length >= count) break;

    try {
      // Randomize page (1–5) to get different results on repeated calls
      const page = Math.floor(Math.random() * 5) + 1;

      console.log(`[Media] Pexels search: "${query}" (page ${page})`);

      const result = await client.photos.search({
        query,
        per_page: Math.min(count - images.length + 3, 15),
        page,
        orientation: 'landscape',
        size: 'large',
      });

      const photos = result.photos || [];

      for (const photo of photos) {
        if (images.length >= count) break;
        if (usedPhotoIds.has(photo.id)) continue;

        usedPhotoIds.add(photo.id);
        images.push({
          url: photo.src.large2x || photo.src.large || photo.src.original,
          alt: photo.alt || query,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          sourceUrl: photo.url,
          sourceName: 'Pexels',
        });
      }
    } catch (err) {
      console.warn(`[Media] Pexels error for "${query}": ${err.message}`);
    }
  }

  return images;
}

// ──────────────────────────────────────────────
// Query builder — creates varied search strings
// ──────────────────────────────────────────────

function buildQueryVariants(topic, keywords) {
  const topWords = topic.split(/\s+/).slice(0, 3).join(' ');
  const kw = keywords.slice(0, 6);

  const variants = [topWords];

  // Add keyword-based variants
  for (let i = 0; i < kw.length - 1; i += 2) {
    variants.push(`${kw[i]} ${kw[i + 1] || ''}`);
  }

  // Add topic + single keyword
  if (kw[0]) variants.push(`${topWords} ${kw[0]}`);
  if (kw[1]) variants.push(`${topWords} ${kw[1]}`);

  // Shuffle to avoid always using same order
  return shuffle(variants).slice(0, 4);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
