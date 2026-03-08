import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { runPipeline } from './pipeline.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Track active pipeline to prevent concurrent runs
let activePipeline = null;

console.log('[Bot] Telegram bot started (polling mode)');

// /write <topic> — run pipeline as draft
bot.onText(/\/write\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const topic = match[1].trim();
  await handlePipeline(chatId, topic, { isDraft: true });
});

// /publish <topic> — run pipeline and publish live
bot.onText(/\/publish\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const topic = match[1].trim();
  await handlePipeline(chatId, topic, { isDraft: false });
});

// /status — check current pipeline status
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  if (activePipeline) {
    bot.sendMessage(chatId, `⏳ Pipeline in progress:\nTopic: "${activePipeline.topic}"\nStage: ${activePipeline.stage}`);
  } else {
    bot.sendMessage(chatId, '💤 No active pipeline. Use /write or /publish to start.');
  }
});

// /help — usage info
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
`📖 *Blog Automation Bot*

*Commands:*
/write <topic> — Research & write a draft post
/publish <topic> — Research, write & publish live
/status — Check pipeline progress
/help — Show this help

*Example:*
/write AI safety in education
/publish The future of quantum computing

*Pipeline stages:*
🔍 Research → 🖼️ Images → ✍️ Writing → 📤 Publishing`, { parse_mode: 'Markdown' });
});

// /start — welcome message
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`👋 Welcome to the Blog Automation Bot!

Send /write <topic> to create a blog post draft, or /publish <topic> to publish directly.

Use /help for more info.`);
});

/**
 * Handle a pipeline run from Telegram.
 */
async function handlePipeline(chatId, topic, { isDraft }) {
  if (activePipeline) {
    bot.sendMessage(chatId, `⚠️ Pipeline already running: "${activePipeline.topic}"\nPlease wait for it to finish or check /status.`);
    return;
  }

  activePipeline = { topic, stage: 'starting', chatId };
  const mode = isDraft ? 'draft' : 'live';

  // Send initial message and keep its ID for updates
  const statusMsg = await bot.sendMessage(chatId,
    `🚀 Starting pipeline (${mode}):\n"${topic}"\n\n⏳ Initializing...`);

  const updateStatus = async (stage, message) => {
    activePipeline.stage = stage;
    try {
      await bot.editMessageText(
        `🚀 Pipeline (${mode}): "${topic}"\n\n${message}`,
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
    } catch {
      // Edit may fail if message content is identical; ignore
    }
  };

  try {
    const result = await runPipeline(topic, {
      isDraft,
      onProgress: updateStatus,
    });

    // Send final success message (separate from the status message)
    const urlLine = result.isDraft
      ? '📋 Saved as draft — check your Blogger dashboard'
      : `🔗 ${result.url}`;

    await bot.sendMessage(chatId,
      `✅ *Post created successfully!*\n\n📝 "${result.title}"\n${urlLine}`,
      { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Bot] Pipeline error:', err);
    await bot.sendMessage(chatId,
      `❌ Pipeline failed at stage: ${activePipeline.stage}\n\nError: ${err.message}`);
  } finally {
    activePipeline = null;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down...');
  bot.stopPolling();
  process.exit(0);
});
