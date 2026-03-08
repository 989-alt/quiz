import { createClient } from 'pexels';

/**
 * Find royalty-free images related to a topic using Pexels API.
 *
 * @param {string} topic - Original topic
 * @param {{keywords: string[]}} researchData - Research data with keywords
 * @param {object} [options]
 * @param {number} [options.count=4] - Number of images to find
 * @returns {Promise<Array<{url: string, alt: string, photographer: string, photographerUrl: string, pexelsUrl: string}>>}
 */
export async function findImages(topic, researchData, { count = 4 } = {}) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[Media] PEXELS_API_KEY not set, skipping image search');
    return [];
  }

  const client = createClient(apiKey);

  // Build search query from topic + top keywords
  const keywords = researchData?.keywords || [];
  const query = keywords.length > 0
    ? keywords.slice(0, 3).join(' ')
    : topic;

  console.log(`[Media] Searching Pexels for: "${query}"`);

  try {
    const result = await client.photos.search({
      query,
      per_page: count + 2,  // fetch extra in case some are unsuitable
      orientation: 'landscape',
      size: 'large',
    });

    if (!result.photos || result.photos.length === 0) {
      console.log('[Media] No images found, trying broader search...');
      // Fallback: search with just the first keyword or topic
      const fallbackQuery = keywords[0] || topic.split(' ')[0];
      const fallback = await client.photos.search({
        query: fallbackQuery,
        per_page: count,
        orientation: 'landscape',
        size: 'large',
      });
      if (!fallback.photos || fallback.photos.length === 0) {
        console.log('[Media] No images found');
        return [];
      }
      result.photos = fallback.photos;
    }

    const images = result.photos.slice(0, count).map((photo) => ({
      url: photo.src.large2x || photo.src.large || photo.src.original,
      alt: photo.alt || topic,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      pexelsUrl: photo.url,
    }));

    console.log(`[Media] Found ${images.length} images`);
    return images;
  } catch (err) {
    console.error(`[Media] Pexels API error: ${err.message}`);
    return [];
  }
}
