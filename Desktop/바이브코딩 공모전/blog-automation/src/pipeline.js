import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

import { research } from './researcher.js';
import { findImages } from './media-finder.js';
import { generateTopicPost } from './claude.js';
import { createPost } from './blogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Run the full multi-agent blog pipeline.
 *
 * @param {string} topic - Topic to write about
 * @param {object} [options]
 * @param {boolean} [options.isDraft=true] - Draft or publish
 * @param {(stage: string, message: string) => void} [options.onProgress] - Progress callback
 * @returns {Promise<{title: string, url: string, postId: string, isDraft: boolean}>}
 */
export async function runPipeline(topic, { isDraft = true, onProgress } = {}) {
  const notify = onProgress || ((stage, msg) => console.log(`[Pipeline] ${msg}`));
  const blogId = process.env.BLOGGER_BLOG_ID;

  if (!blogId) throw new Error('BLOGGER_BLOG_ID not set in .env');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set in .env');

  // Step 1: Research
  notify('research', `🔍 Researching: "${topic}"...`);
  const researchData = await research(topic);
  notify('research_done', `📋 Found ${researchData.keyPoints.length} key points, ${researchData.sources.length} sources`);

  // Step 2: Find images
  notify('media', '🖼️ Finding images...');
  const images = await findImages(topic, researchData);
  notify('media_done', `📸 Found ${images.length} images`);

  // Step 3: Generate blog post
  notify('writing', '✍️ Writing blog post with Claude...');
  const post = await generateTopicPost(topic, researchData, images);
  notify('writing_done', `📝 Generated: "${post.title}"`);

  // Step 4: Apply template
  const template = await loadTemplate();
  const htmlBody = renderTemplate(template, post, images);

  // Step 5: Publish to Blogger
  notify('publishing', `📤 ${isDraft ? 'Saving draft' : 'Publishing'}...`);
  const result = await createPost({
    blogId,
    title: post.title,
    content: htmlBody,
    labels: post.labels,
    isDraft,
  });

  const url = result.url || '(draft — no public URL yet)';
  notify('done', `✅ Done! ${isDraft ? 'Draft saved' : 'Published'}: ${url}`);

  return {
    title: result.title,
    url,
    postId: result.id,
    isDraft,
  };
}

async function loadTemplate() {
  const templatePath = path.join(ROOT, 'templates', 'post-template.html');
  return readFile(templatePath, 'utf-8');
}

function renderTemplate(template, post, images) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build image credits section
  const imageCredits = images.length > 0
    ? images.map((img) =>
        `<a href="${img.pexelsUrl}" target="_blank" rel="noopener">${img.photographer}</a>`
      ).join(', ')
    : '';

  return template
    .replace('{{content}}', post.content)
    .replace('{{metaDescription}}', post.metaDescription)
    .replace('{{date}}', today)
    .replace('{{imageCredits}}', imageCredits);
}
