import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const client = new Anthropic();  // reads ANTHROPIC_API_KEY from env
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT_NEWS = `You are an expert AI technology journalist and SEO specialist.
Your task is to write engaging, well-researched blog posts about AI news for a general tech audience.

Writing guidelines:
- Write in clear, professional English
- Use an informative yet engaging tone
- Include relevant context and analysis, not just summaries
- Structure with clear HTML headings (h2, h3)
- Add a compelling introduction and conclusion
- Include source attribution with links
- Target 800-1200 words
- Optimize for SEO with natural keyword usage

Output format:
Return a JSON object with exactly these fields:
{
  "title": "SEO-optimized blog post title (50-60 chars ideal)",
  "metaDescription": "Compelling meta description for search engines (150-160 chars)",
  "labels": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content": "<article>...full HTML blog post body...</article>"
}

HTML rules for content field:
- Use semantic HTML: <article>, <section>, <h2>, <h3>, <p>, <ul>, <li>, <blockquote>
- Link to original sources using <a href="..." target="_blank" rel="noopener">
- Do NOT include <html>, <head>, <body>, or <style> tags
- Do NOT include the title as an <h1> (Blogger adds it automatically)`;

const SYSTEM_PROMPT_TOPIC = `You are a world-class blog writer and SEO specialist.
Your task is to write an in-depth, engaging blog post on a given topic, using provided research and images.

Writing guidelines:
- Write in clear, professional English
- Use an authoritative yet approachable tone
- Go beyond surface-level — provide analysis, context, and original insights
- Structure with clear HTML headings (h2, h3) for readability
- Target 1500-2500 words for thorough coverage
- Optimize for SEO with natural keyword usage
- Include a compelling hook introduction and actionable conclusion

Image insertion rules:
- Insert provided images at relevant points in the article using <figure> tags
- Each image MUST have a <figcaption> with photographer credit and Pexels link
- Space images evenly throughout the article (not all at top or bottom)
- Use this exact format for each image:
  <figure style="margin: 2em 0; text-align: center;">
    <img src="IMAGE_URL" alt="ALT_TEXT" style="max-width: 100%; height: auto; border-radius: 8px;" loading="lazy" />
    <figcaption style="font-size: 0.85em; color: #666; margin-top: 0.5em;">
      Photo by <a href="PHOTOGRAPHER_URL" target="_blank" rel="noopener">PHOTOGRAPHER</a> on <a href="PEXELS_URL" target="_blank" rel="noopener">Pexels</a>
    </figcaption>
  </figure>

YouTube video embedding:
- If YouTube video URLs are provided, embed 1-2 relevant ones using:
  <div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 2em 0;">
    <iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" frameborder="0" allowfullscreen></iframe>
  </div>

Source attribution:
- Reference research sources naturally within the text
- Link to sources using <a href="..." target="_blank" rel="noopener">

Output format:
Return a JSON object with exactly these fields:
{
  "title": "SEO-optimized blog post title (50-60 chars ideal)",
  "metaDescription": "Compelling meta description for search engines (150-160 chars)",
  "labels": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content": "<article>...full HTML blog post body with images embedded...</article>"
}

HTML rules for content field:
- Use semantic HTML: <article>, <section>, <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <figure>
- Do NOT include <html>, <head>, <body>, or <style> tags
- Do NOT include the title as an <h1> (Blogger adds it automatically)`;

/**
 * Generate a blog post from news items using Claude API (legacy RSS mode).
 */
export async function generatePost(newsItems, { model } = {}) {
  const modelId = model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

  const newsContext = newsItems
    .map((item, i) => (
      `[${i + 1}] ${item.title}\n    Source: ${item.source}\n    Link: ${item.link}\n    Summary: ${item.summary}`
    ))
    .join('\n\n');

  const userPrompt = `Here are today's top AI news stories. Write a comprehensive blog post covering the most significant developments:\n\n${newsContext}\n\nGenerate the blog post as a JSON object following the format specified in your instructions.`;

  console.log(`[Claude] Generating post with ${modelId}...`);

  const stream = client.messages.stream({
    model: modelId,
    max_tokens: 4096,
    system: SYSTEM_PROMPT_NEWS,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const response = await stream.finalMessage();
  return parseClaudeResponse(response);
}

/**
 * Generate a blog post from topic + research data + images using Claude API.
 *
 * @param {string} topic
 * @param {{summary: string, keyPoints: string[], sources: string[], youtubeVideos: string[]}} researchData
 * @param {Array<{url: string, alt: string, photographer: string, photographerUrl: string, pexelsUrl: string}>} images
 * @param {object} [options]
 * @param {string} [options.model] - Claude model override
 * @returns {Promise<{title: string, metaDescription: string, labels: string[], content: string}>}
 */
export async function generateTopicPost(topic, researchData, images, { model } = {}) {
  const modelId = model || 'gemini-2.5-pro-preview-03-25';

  const imageContext = images.length > 0
    ? `\n\nAvailable images to embed in the article:\n${images.map((img, i) => `[Image ${i + 1}]\n  URL: ${img.url}\n  Alt: ${img.alt}\n  Photographer: ${img.photographer}\n  Photographer URL: ${img.photographerUrl}\n  Pexels URL: ${img.pexelsUrl}`).join('\n\n')}`
    : '\n\n(No images available — write without images)';

  const videoContext = researchData.youtubeVideos?.length > 0
    ? `\n\nRelevant YouTube videos to consider embedding:\n${researchData.youtubeVideos.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}`
    : '';

  const sourcesContext = researchData.sources?.length > 0
    ? `\n\nResearch sources:\n${researchData.sources.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}`
    : '';

  const userPrompt = `Write an in-depth blog post about: "${topic}"

Research findings:
${researchData.summary}

Key points:
${(researchData.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}
${sourcesContext}${imageContext}${videoContext}

Generate the blog post as a JSON object following the format specified in your instructions. Make sure to embed all provided images at appropriate points throughout the article.`;

  console.log(`[Writer] Generating topic post with ${modelId}...`);

  const response = await genai.models.generateContent({
    model: modelId,
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT_TOPIC,
      temperature: 0.8,
    },
  });

  const text = response.text
    .replace(/^```json?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  const result = JSON.parse(text);

  if (!result.title || !result.content) {
    throw new Error('Gemini response missing required fields (title, content)');
  }

  console.log(`[Writer] Generated: "${result.title}"`);
  console.log(`[Writer] Labels: ${(result.labels || []).join(', ')}`);

  return {
    title: result.title,
    metaDescription: result.metaDescription || '',
    labels: result.labels || [],
    content: result.content,
  };
}

/**
 * Parse Claude response and extract JSON post data.
 */
function parseClaudeResponse(response) {
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in Claude response');
  }

  const jsonText = textBlock.text
    .replace(/^```json?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  const result = JSON.parse(jsonText);

  if (!result.title || !result.content) {
    throw new Error('Claude response missing required fields (title, content)');
  }

  console.log(`[Claude] Generated: "${result.title}"`);
  console.log(`[Claude] Labels: ${(result.labels || []).join(', ')}`);
  console.log(`[Claude] Tokens — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`);

  return {
    title: result.title,
    metaDescription: result.metaDescription || '',
    labels: result.labels || [],
    content: result.content,
  };
}
