import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

import { research } from './researcher.js';
import { findImages } from './media-finder.js';
import { generateTopicPost } from './claude.js';
import { createPost as bloggerCreatePost } from './blogger.js';
import { createPost as tistoryCreatePost, detectCategory } from './tistory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Run the full multi-agent blog pipeline.
 *
 * @param {string} topic
 * @param {object} [options]
 * @param {boolean} [options.isDraft=true]
 * @param {'blogger'|'tistory'|'both'} [options.target='blogger']
 * @param {string} [options.tistoryCategory] - 'ai-news' | 'programs' | 'ai-usage' | auto-detect
 * @param {(stage: string, message: string) => void} [options.onProgress]
 * @returns {Promise<Array<{platform, title, url, postId, isDraft}>>}
 */
export async function runPipeline(topic, { isDraft = true, target = 'blogger', tistoryCategory, onProgress } = {}) {
  const notify = onProgress || ((stage, msg) => console.log(`[Pipeline] ${msg}`));

  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in .env');
  if ((target === 'blogger' || target === 'both') && !process.env.BLOGGER_BLOG_ID) {
    throw new Error('BLOGGER_BLOG_ID not set in .env');
  }
  if ((target === 'tistory' || target === 'both') && !process.env.TISTORY_BLOG_NAME) {
    throw new Error('TISTORY_BLOG_NAME not set in .env');
  }

  // Step 1: Research
  notify('research', `🔍 주제 조사 중: "${topic}"...`);
  const researchData = await research(topic);
  notify('research_done', `📋 핵심 포인트 ${researchData.keyPoints.length}개, 출처 ${researchData.sources.length}개 발견`);

  // Step 2: Find images
  notify('media', '🖼️ 이미지 수집 중...');
  const images = await findImages(topic, researchData);
  notify('media_done', `📸 이미지 ${images.length}개 수집 완료`);

  // Step 3: Generate blog post
  notify('writing', '✍️ Gemini 2.5 Pro로 글 작성 중...');
  const post = await generateTopicPost(topic, researchData, images);
  notify('writing_done', `📝 작성 완료: "${post.title}"`);

  // Step 4: Apply template
  const template = await loadTemplate();
  const htmlBody = renderTemplate(template, post, images);

  // Step 5: Publish
  notify('publishing', `📤 ${isDraft ? '초안 저장' : '발행'} 중 (${target})...`);
  const results = [];

  if (target === 'blogger' || target === 'both') {
    const blogId = process.env.BLOGGER_BLOG_ID;
    const result = await bloggerCreatePost({
      blogId,
      title: post.title,
      content: htmlBody,
      labels: post.labels,
      isDraft,
    });
    const url = result.url || '(draft — Blogger 대시보드 확인)';
    results.push({ platform: 'blogger', title: result.title, url, postId: result.id, isDraft });
  }

  if (target === 'tistory' || target === 'both') {
    const categoryKey = tistoryCategory || detectCategory(post.labels);
    const result = await tistoryCreatePost({
      title: post.title,
      content: htmlBody,
      labels: post.labels,
      isDraft,
      categoryKey,
    });
    results.push({ platform: 'tistory', title: result.title, url: result.url, postId: result.postId, isDraft });
  }

  const summary = results.map((r) => `${r.platform}: ${r.url}`).join('\n');
  notify('done', `✅ 완료!\n${summary}`);

  return results;
}

async function loadTemplate() {
  const templatePath = path.join(ROOT, 'templates', 'post-template.html');
  return readFile(templatePath, 'utf-8');
}

function renderTemplate(template, post, images) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const imageCredits = images
    .map((img) => {
      const name = img.photographer || 'Unknown';
      const url = img.photographerUrl || img.sourceUrl || '#';
      const source = img.sourceName || 'Pexels';
      return `<a href="${url}" target="_blank" rel="noopener">${name}</a> (${source})`;
    })
    .join(', ');

  return template
    .replace('{{content}}', post.content)
    .replace('{{metaDescription}}', post.metaDescription)
    .replace('{{date}}', today)
    .replace('{{imageCredits}}', imageCredits);
}
