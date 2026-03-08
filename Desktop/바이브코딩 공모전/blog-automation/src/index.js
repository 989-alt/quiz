import 'dotenv/config';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

import { fetchNews } from './news-fetcher.js';
import { generatePost } from './claude.js';
import { createPost } from './blogger.js';
import { runPipeline } from './pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AI Blog Automation
==================

Usage:
  node src/index.js --topic "AI safety"     Topic-based pipeline (new)
  node src/index.js --rss                   RSS news pipeline (legacy)
  node src/index.js                         RSS news pipeline (default)

Options:
  --topic <str>   Write a blog post about a specific topic
  --rss           Use RSS news feed pipeline (legacy)
  --draft         Create post as draft (default)
  --publish       Publish post immediately (live)
  --hours N       [RSS] Look back N hours for news (default: 24)
  --max N         [RSS] Maximum news items to fetch (default: 10)
  --help, -h      Show this help message

Examples:
  node src/index.js --topic "AI safety in education" --draft
  node src/index.js --topic "quantum computing" --publish
  node src/index.js --rss --hours 48

Telegram bot:
  node src/telegram-bot.js    Start the Telegram bot
`);
    process.exit(0);
  }

  const topicIdx = args.indexOf('--topic');
  const topic = topicIdx !== -1 && topicIdx + 1 < args.length
    ? args[topicIdx + 1]
    : null;

  return {
    topic,
    isRss: args.includes('--rss') || !topic,
    isDraft: !args.includes('--publish'),
    hoursAgo: getArgValue(args, '--hours', 24),
    maxItems: getArgValue(args, '--max', 10),
  };
}

function getArgValue(args, flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return defaultVal;
  const val = parseInt(args[idx + 1], 10);
  return isNaN(val) ? defaultVal : val;
}

async function loadTemplate() {
  const templatePath = path.join(ROOT, 'templates', 'post-template.html');
  return readFile(templatePath, 'utf-8');
}

function renderTemplate(template, data) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return template
    .replace('{{content}}', data.content)
    .replace('{{metaDescription}}', data.metaDescription)
    .replace('{{date}}', today)
    .replace('{{imageCredits}}', '');
}

async function runRssPipeline(config) {
  console.log('=== AI News Blog Automation (RSS) ===\n');
  console.log(`Mode: ${config.isDraft ? 'DRAFT' : 'PUBLISH'}`);
  console.log(`Looking back: ${config.hoursAgo} hours`);
  console.log(`Max items: ${config.maxItems}\n`);

  // Step 1: Fetch news
  console.log('--- Step 1: Fetching AI news ---');
  const news = await fetchNews({
    hoursAgo: config.hoursAgo,
    maxItems: config.maxItems,
  });

  if (news.length === 0) {
    console.log('No recent AI news found. Try increasing --hours.');
    process.exit(0);
  }

  console.log(`Found ${news.length} articles:\n`);
  news.forEach((item, i) => {
    console.log(`  ${i + 1}. [${item.source}] ${item.title}`);
  });
  console.log();

  // Step 2: Generate blog post with Claude
  console.log('--- Step 2: Generating blog post ---');
  const post = await generatePost(news);

  // Step 3: Apply template
  console.log('\n--- Step 3: Applying template ---');
  const template = await loadTemplate();
  const htmlBody = renderTemplate(template, post);

  // Step 4: Post to Blogger
  console.log('\n--- Step 4: Posting to Blogger ---');
  const blogId = process.env.BLOGGER_BLOG_ID;
  const result = await createPost({
    blogId,
    title: post.title,
    content: htmlBody,
    labels: post.labels,
    isDraft: config.isDraft,
  });

  console.log('\n=== Done! ===');
  console.log(`Post "${result.title}" created successfully.`);
  if (config.isDraft) {
    console.log('Post is saved as DRAFT. Review it in Blogger dashboard before publishing.');
  }
}

async function runTopicPipeline(config) {
  console.log('=== AI Blog Automation (Topic) ===\n');
  console.log(`Topic: "${config.topic}"`);
  console.log(`Mode: ${config.isDraft ? 'DRAFT' : 'PUBLISH'}\n`);

  const result = await runPipeline(config.topic, {
    isDraft: config.isDraft,
  });

  console.log('\n=== Done! ===');
  console.log(`Post "${result.title}" created successfully.`);
  if (result.isDraft) {
    console.log('Post is saved as DRAFT. Review it in Blogger dashboard before publishing.');
  } else {
    console.log(`Published at: ${result.url}`);
  }
}

async function main() {
  const config = parseArgs();

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY not set. Copy .env.example to .env and fill in your key.');
    process.exit(1);
  }
  if (!process.env.BLOGGER_BLOG_ID) {
    console.error('Error: BLOGGER_BLOG_ID not set. Add your blog ID to .env');
    process.exit(1);
  }

  if (config.topic) {
    await runTopicPipeline(config);
  } else {
    await runRssPipeline(config);
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
