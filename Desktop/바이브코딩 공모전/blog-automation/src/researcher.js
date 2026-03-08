import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Research a topic using Gemini with Google Search grounding.
 *
 * @param {string} topic - Topic to research
 * @returns {Promise<{summary: string, keyPoints: string[], sources: string[], keywords: string[]}>}
 */
export async function research(topic) {
  console.log(`[Researcher] Researching: "${topic}"`);

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a thorough research analyst. Research the following topic in depth and provide a comprehensive analysis.

Topic: "${topic}"

Provide your response as a JSON object with these fields:
{
  "summary": "A comprehensive 3-5 paragraph summary of the topic with key facts, statistics, and expert opinions",
  "keyPoints": ["point1", "point2", ...],  // 5-8 key findings
  "sources": ["url1", "url2", ...],  // source URLs found during research
  "keywords": ["keyword1", "keyword2", ...],  // 5-10 relevant keywords for image search
  "youtubeVideos": ["url1", "url2"]  // relevant YouTube video URLs if found (0-2)
}

Be thorough, factual, and include recent data. Return ONLY the JSON object.`,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.7,
    },
  });

  const text = response.text
    .replace(/^```json?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    // If JSON parsing fails, extract what we can
    console.warn('[Researcher] Failed to parse JSON, using raw text');
    result = {
      summary: response.text,
      keyPoints: [],
      sources: [],
      keywords: topic.split(/\s+/),
      youtubeVideos: [],
    };
  }

  // Extract grounding sources from the response metadata if available
  const groundingSources = extractGroundingSources(response);
  if (groundingSources.length > 0) {
    result.sources = [...new Set([...(result.sources || []), ...groundingSources])];
  }

  console.log(`[Researcher] Found ${(result.keyPoints || []).length} key points, ${(result.sources || []).length} sources`);

  return {
    summary: result.summary || '',
    keyPoints: result.keyPoints || [],
    sources: result.sources || [],
    keywords: result.keywords || topic.split(/\s+/),
    youtubeVideos: result.youtubeVideos || [],
  };
}

/**
 * Extract grounding source URLs from Gemini response metadata.
 */
function extractGroundingSources(response) {
  try {
    const candidate = response.candidates?.[0];
    const metadata = candidate?.groundingMetadata;
    if (!metadata?.groundingChunks) return [];

    return metadata.groundingChunks
      .filter((chunk) => chunk.web?.uri)
      .map((chunk) => chunk.web.uri);
  } catch {
    return [];
  }
}
