import { google } from 'googleapis';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CREDENTIALS_PATH = path.join(ROOT, 'credentials.json');
const TOKEN_PATH = path.join(ROOT, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/blogger'];

async function loadCredentials() {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `credentials.json not found at ${CREDENTIALS_PATH}\n` +
      'Download it from Google Cloud Console > APIs & Services > Credentials'
    );
  }
  const content = await readFile(CREDENTIALS_PATH, 'utf-8');
  const { installed, web } = JSON.parse(content);
  const creds = installed || web;
  if (!creds) {
    throw new Error('Invalid credentials.json format. Expected "installed" or "web" key.');
  }
  return creds;
}

async function loadSavedToken() {
  if (!existsSync(TOKEN_PATH)) return null;
  const content = await readFile(TOKEN_PATH, 'utf-8');
  return JSON.parse(content);
}

async function saveToken(token) {
  await writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log('Token saved to', TOKEN_PATH);
}

/**
 * Start a local HTTP server on a free port, then return the port and
 * a promise that resolves with the auth code when Google redirects back.
 */
function createAuthServer() {
  return new Promise((resolveServer, rejectServer) => {
    let resolveCode, rejectCode;
    const codePromise = new Promise((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);
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
        res.end('<h1>✅ 인증 성공!</h1><p>이 탭을 닫고 터미널로 돌아가세요.</p>');
        server.close();
        resolveCode(code);
        return;
      }

      // Ignore favicon etc.
      res.writeHead(200);
      res.end('');
    });

    server.listen(0, () => {
      const port = server.address().port;
      console.log(`[Auth] Local server listening on http://localhost:${port}`);
      resolveServer({ port, codePromise });
    });

    server.on('error', rejectServer);
  });
}

/**
 * Get an authenticated Google OAuth2 client for Blogger API.
 */
export async function getAuthClient() {
  const creds = await loadCredentials();

  const savedToken = await loadSavedToken();
  if (savedToken) {
    const oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      'http://localhost'
    );
    oauth2Client.setCredentials(savedToken);

    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        savedToken.refresh_token = tokens.refresh_token;
      }
      savedToken.access_token = tokens.access_token;
      savedToken.expiry_date = tokens.expiry_date;
      await saveToken(savedToken);
    });

    return oauth2Client;
  }

  // 1. Start local server first to get the port
  const { port, codePromise } = await createAuthServer();
  const redirectUri = `http://localhost:${port}`;

  // 2. Create OAuth client with the actual redirect URI (including port)
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    redirectUri
  );

  // 3. Generate auth URL with matching redirect URI
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n=== Google OAuth Authorization ===');
  console.log('Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization...\n');

  // 4. Wait for Google to redirect back with the code
  const code = await codePromise;

  // 5. Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  await saveToken(tokens);

  console.log('Authorization successful!\n');
  return oauth2Client;
}

// Allow running directly: node src/auth.js
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    await getAuthClient();
    console.log('Auth test passed — client ready.');
  } catch (err) {
    console.error('Auth failed:', err.message);
    process.exit(1);
  }
}
