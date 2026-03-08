import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TOKEN_PATH = path.join(ROOT, 'tistory-token.json');

const TISTORY_AUTH_URL = 'https://www.tistory.com/oauth/authorize';
const TISTORY_TOKEN_URL = 'https://www.tistory.com/oauth/access_token';
const TISTORY_API_BASE = 'https://www.tistory.com/apis';

/**
 * Tistory category mapping (configure via .env or set TISTORY_CATEGORY_* vars)
 *
 * Categories on your Tistory blog:
 *  - 내가 만든 프로그램들  → TISTORY_CATEGORY_PROGRAMS
 *  - AI 뉴스             → TISTORY_CATEGORY_AI_NEWS
 *  - AI 활용 기록         → TISTORY_CATEGORY_AI_USAGE  (default)
 */
function getCategoryId(categoryKey) {
  const map = {
    programs: process.env.TISTORY_CATEGORY_PROGRAMS || '0',
    'ai-news': process.env.TISTORY_CATEGORY_AI_NEWS || '0',
    'ai-usage': process.env.TISTORY_CATEGORY_AI_USAGE || '0',
  };
  return map[categoryKey] || map['ai-usage'];
}

/**
 * Detect category from post labels automatically.
 */
export function detectCategory(labels = []) {
  const lower = labels.map((l) => l.toLowerCase()).join(' ');
  if (/news|breaking|update|latest|report/.test(lower)) return 'ai-news';
  if (/project|tool|app|program|built|made|demo/.test(lower)) return 'programs';
  return 'ai-usage';
}

// ──────────────────────────────────────────────
// OAuth helpers
// ──────────────────────────────────────────────

async function loadSavedToken() {
  if (!existsSync(TOKEN_PATH)) return null;
  const content = await readFile(TOKEN_PATH, 'utf-8');
  return JSON.parse(content).access_token || null;
}

async function saveToken(accessToken) {
  await writeFile(TOKEN_PATH, JSON.stringify({ access_token: accessToken }, null, 2));
  console.log('[Tistory] Token saved to', TOKEN_PATH);
}

function startLocalServer() {
  return new Promise((resolveServer) => {
    let resolveCode, rejectCode;
    const codePromise = new Promise((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>인증 실패</h1><p>${error}</p>`);
        server.close();
        rejectCode(new Error(`OAuth error: ${error}`));
        return;
      }
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>✅ 티스토리 인증 성공!</h1><p>이 탭을 닫고 터미널로 돌아가세요.</p>');
        server.close();
        resolveCode(code);
        return;
      }
      res.writeHead(200);
      res.end('');
    });

    server.listen(0, () => {
      const port = server.address().port;
      resolveServer({ port, codePromise });
    });
    server.on('error', (err) => rejectCode(err));
  });
}

/**
 * Authenticate with Tistory and return access token.
 * Saves token to tistory-token.json for reuse.
 */
export async function getAccessToken() {
  const saved = await loadSavedToken();
  if (saved) return saved;

  const clientId = process.env.TISTORY_APP_ID;
  const clientSecret = process.env.TISTORY_APP_SECRET;
  const blogName = process.env.TISTORY_BLOG_NAME;

  if (!clientId || !clientSecret || !blogName) {
    throw new Error('TISTORY_APP_ID, TISTORY_APP_SECRET, TISTORY_BLOG_NAME must be set in .env');
  }

  const { port, codePromise } = await startLocalServer();
  const redirectUri = `http://localhost:${port}`;

  const authUrl = `${TISTORY_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  console.log('\n=== Tistory OAuth Authorization ===');
  console.log('Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization...\n');

  const code = await codePromise;

  // Exchange code for token (Tistory returns URL-encoded string, not JSON)
  const tokenUrl = `${TISTORY_TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}&grant_type=authorization_code`;
  const res = await fetch(tokenUrl);
  const body = await res.text();

  // Response format: "access_token=TOKEN&token_type=bearer"
  const params = new URLSearchParams(body);
  const accessToken = params.get('access_token');

  if (!accessToken) {
    throw new Error(`Failed to get Tistory access token. Response: ${body}`);
  }

  await saveToken(accessToken);
  console.log('[Tistory] Authorization successful!\n');
  return accessToken;
}

// ──────────────────────────────────────────────
// Post API
// ──────────────────────────────────────────────

/**
 * Create a post on Tistory.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.content - HTML content
 * @param {string[]} [options.labels] - Tags
 * @param {boolean} [options.isDraft=true]
 * @param {string} [options.categoryKey='ai-usage'] - 'ai-news' | 'programs' | 'ai-usage'
 * @returns {Promise<{title: string, url: string, postId: string}>}
 */
export async function createPost({ title, content, labels = [], isDraft = true, categoryKey = 'ai-usage' }) {
  const accessToken = await getAccessToken();
  const blogName = process.env.TISTORY_BLOG_NAME;

  if (!blogName) throw new Error('TISTORY_BLOG_NAME not set in .env');

  const visibility = isDraft ? '0' : '3'; // 0=비공개, 3=발행
  const categoryId = getCategoryId(categoryKey);
  const tag = labels.slice(0, 10).join(',');

  const formData = new URLSearchParams({
    access_token: accessToken,
    output: 'json',
    blogName,
    title,
    content,
    visibility,
    category: categoryId,
    tag,
  });

  const res = await fetch(`${TISTORY_API_BASE}/post/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const data = await res.json();

  if (data.tistory?.status !== '200') {
    throw new Error(`Tistory API error: ${JSON.stringify(data.tistory)}`);
  }

  const postId = data.tistory.postId;
  const url = data.tistory.url || `https://${blogName}.tistory.com/${postId}`;
  const status = isDraft ? 'DRAFT' : 'LIVE';

  console.log(`[Tistory] Post created (${status}): ${title}`);
  console.log(`[Tistory] URL: ${url}`);

  return { title, url, postId };
}

/**
 * List categories on the blog. Run this once to get category IDs for .env.
 */
export async function listCategories() {
  const accessToken = await getAccessToken();
  const blogName = process.env.TISTORY_BLOG_NAME;

  const url = `${TISTORY_API_BASE}/category/list?access_token=${accessToken}&output=json&blogName=${blogName}`;
  const res = await fetch(url);
  const data = await res.json();

  const categories = data.tistory?.item?.categories || [];
  return categories.map((c) => ({ id: c.id, name: c.name, count: c.count }));
}

// Allow running directly: node src/tistory.js --list-categories
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const { config } = await import('dotenv');
  config();

  if (process.argv.includes('--list-categories')) {
    const cats = await listCategories();
    console.log('\nTistory Categories:');
    cats.forEach((c) => console.log(`  ID: ${c.id}  Name: ${c.name}  Posts: ${c.count}`));
    console.log('\nAdd to .env:');
    console.log('TISTORY_CATEGORY_AI_NEWS=<id>');
    console.log('TISTORY_CATEGORY_PROGRAMS=<id>');
    console.log('TISTORY_CATEGORY_AI_USAGE=<id>');
  } else {
    const token = await getAccessToken();
    console.log('Auth OK. Token:', token.slice(0, 10) + '...');
  }
}
