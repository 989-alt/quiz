import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { runPipeline } from './pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
let activePipeline = null;

console.log('[Bot] Telegram bot started (polling mode)');

// ──────────────────────────────────────────────
// Commands
// ──────────────────────────────────────────────

// /write <topic>  — Blogger 초안 + 파일 저장
bot.onText(/\/write\s+(.+)/, async (msg, match) => {
  await handlePipeline(msg.chat.id, match[1].trim(), { isDraft: true, postBlogger: true });
});

// /publish <topic>  — Blogger 즉시 발행 + 파일 저장
bot.onText(/\/publish\s+(.+)/, async (msg, match) => {
  await handlePipeline(msg.chat.id, match[1].trim(), { isDraft: false, postBlogger: true });
});

// /file <topic>  — 파일만 저장 (Blogger 미발행, 티스토리 등 수동 업로드용)
bot.onText(/\/file\s+(.+)/, async (msg, match) => {
  await handlePipeline(msg.chat.id, match[1].trim(), { isDraft: true, postBlogger: false });
});

// /status
bot.onText(/\/status/, (msg) => {
  if (activePipeline) {
    bot.sendMessage(msg.chat.id,
      `⏳ 파이프라인 실행 중\n주제: "${activePipeline.topic}"\n단계: ${activePipeline.stage}`);
  } else {
    bot.sendMessage(msg.chat.id, '💤 실행 중인 파이프라인 없음');
  }
});

// /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
`📖 *블로그 자동화 봇*

*명령어:*
/write \\<주제\\> — Blogger 초안 + 파일 저장
/publish \\<주제\\> — Blogger 즉시 발행 + 파일 저장
/file \\<주제\\> — 파일만 저장 (티스토리 수동 업로드용)
/status — 진행 상태
/help — 도움말

*티스토리 업로드 방법:*
1\\. /file <주제> 로 글 생성
2\\. PC에서 output/ 폴더의 HTML 파일 열기
3\\. 내용 복사 → 티스토리 HTML 에디터에 붙여넣기

*파이프라인:*
🔍 리서치 → 🖼️ 이미지 → ✍️ 글작성 → 📤 발행/저장`, { parse_mode: 'Markdown' });
});

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`👋 블로그 자동화 봇입니다!

/write <주제> — Blogger 초안 작성 + 파일 저장
/file <주제> — 파일만 저장 (티스토리용)
/publish <주제> — Blogger 즉시 발행

/help 로 자세한 사용법을 확인하세요.`);
});

// ──────────────────────────────────────────────
// Pipeline handler
// ──────────────────────────────────────────────

async function handlePipeline(chatId, topic, { isDraft, postBlogger }) {
  if (activePipeline) {
    bot.sendMessage(chatId, `⚠️ 이미 실행 중: "${activePipeline.topic}"\n/status로 확인하세요.`);
    return;
  }

  activePipeline = { topic, stage: 'starting', chatId };
  const modeLabel = !postBlogger ? '파일 저장' : isDraft ? 'Blogger 초안' : 'Blogger 발행';

  const statusMsg = await bot.sendMessage(chatId,
    `🚀 파이프라인 시작 (${modeLabel})\n"${topic}"\n\n⏳ 초기화 중...`);

  const updateStatus = async (stage, message) => {
    activePipeline.stage = stage;
    try {
      await bot.editMessageText(
        `🚀 파이프라인 (${modeLabel})\n"${topic}"\n\n${message}`,
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
    } catch { /* ignore same-content edit error */ }
  };

  try {
    const result = await runPipeline(topic, {
      isDraft,
      saveFile: true,
      postBlogger,
      onProgress: updateStatus,
    });

    const lines = [];
    if (postBlogger) {
      lines.push(result.isDraft
        ? '📋 Blogger: 초안 저장됨 (대시보드 확인)'
        : `📋 Blogger: ${result.bloggerUrl}`);
    }
    if (result.filePath) {
      const rel = path.relative(ROOT, result.filePath);
      lines.push(`💾 파일: ${rel}`);
      lines.push('👆 티스토리: 위 파일을 열어 내용을 HTML 에디터에 붙여넣으세요');
    }

    await bot.sendMessage(chatId,
      `✅ *완료!*\n\n📝 "${result.title}"\n\n${lines.join('\n')}`,
      { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Bot] Pipeline error:', err);
    await bot.sendMessage(chatId,
      `❌ 실패 (단계: ${activePipeline.stage})\n\n오류: ${err.message}`);
  } finally {
    activePipeline = null;
  }
}

process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down...');
  bot.stopPolling();
  process.exit(0);
});
