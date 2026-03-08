import { readFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

import { research } from './researcher.js';
import { findImages } from './media-finder.js';
import { generateTopicPost } from './claude.js';
import { createPost as bloggerCreatePost } from './blogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');

/**
 * Run the full multi-agent blog pipeline.
 *
 * @param {string} topic
 * @param {object} [options]
 * @param {boolean} [options.isDraft=true]       - Blogger: draft or live
 * @param {boolean} [options.saveFile=true]      - Save HTML to output/ for manual posting
 * @param {boolean} [options.postBlogger=true]   - Also post to Blogger
 * @param {(stage: string, message: string) => void} [options.onProgress]
 * @returns {Promise<{title, bloggerUrl, filePath, isDraft}>}
 */
export async function runPipeline(topic, {
  isDraft = true,
  saveFile = true,
  postBlogger = true,
  onProgress,
} = {}) {
  const notify = onProgress || ((stage, msg) => console.log(`[Pipeline] ${msg}`));

  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in .env');
  if (postBlogger && !process.env.BLOGGER_BLOG_ID) throw new Error('BLOGGER_BLOG_ID not set in .env');

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

  const result = { title: post.title, bloggerUrl: null, filePath: null, isDraft };

  // Step 5a: Save to file (for manual posting, e.g. Tistory)
  if (saveFile) {
    const filePath = await saveToFile(post.title, htmlBody);
    result.filePath = filePath;
    notify('file_saved', `💾 파일 저장: ${path.relative(ROOT, filePath)}`);
  }

  // Step 5b: Post to Blogger
  if (postBlogger) {
    notify('publishing', `📤 Blogger ${isDraft ? '초안 저장' : '발행'} 중...`);
    const blogId = process.env.BLOGGER_BLOG_ID;
    const blogResult = await bloggerCreatePost({
      blogId,
      title: post.title,
      content: htmlBody,
      labels: post.labels,
      isDraft,
    });
    result.bloggerUrl = blogResult.url || null;
  }

  const done = [
    postBlogger ? `Blogger: ${result.bloggerUrl || '초안 저장됨'}` : null,
    saveFile ? `파일: output/${path.basename(result.filePath)}` : null,
  ].filter(Boolean).join('\n');

  notify('done', `✅ 완료!\n${done}`);
  return result;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function loadTemplate() {
  return readFile(path.join(ROOT, 'templates', 'post-template.html'), 'utf-8');
}

function renderTemplate(template, post, images) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
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
    .replace('{{imageCredits}}', imageCredits || '없음');
}

async function saveToFile(title, htmlContent) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Sanitize title for filename
  const safeTitle = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${dateStr}-${safeTitle}.html`;
  const filePath = path.join(OUTPUT_DIR, filename);

  // Wrap in a complete HTML page for easy browser preview
  const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: sans-serif; line-height: 1.7; color: #333; }
    img { max-width: 100%; border-radius: 8px; }
    figure { margin: 2em 0; }
    figcaption { font-size: 0.85em; color: #888; margin-top: 0.4em; }
    h2 { margin-top: 2em; }
    blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #555; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>`;

  await writeFile(filePath, fullHtml, 'utf-8');
  return filePath;
}
