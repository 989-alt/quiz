import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { runPipeline } from './pipeline.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
let activePipeline = null;

console.log('[Bot] Telegram bot started (polling mode)');

// ──────────────────────────────────────────────
// Command parsers
// ──────────────────────────────────────────────

// /write [blogger|tistory|both] <topic>
bot.onText(/\/write(?:\s+(blogger|tistory|both))?\s+(.+)/, async (msg, match) => {
  const target = match[1] || 'both';
  const topic = match[2].trim();
  await handlePipeline(msg.chat.id, topic, { isDraft: true, target });
});

// /publish [blogger|tistory|both] <topic>
bot.onText(/\/publish(?:\s+(blogger|tistory|both))?\s+(.+)/, async (msg, match) => {
  const target = match[1] || 'both';
  const topic = match[2].trim();
  await handlePipeline(msg.chat.id, topic, { isDraft: false, target });
});

// /status
bot.onText(/\/status/, (msg) => {
  if (activePipeline) {
    bot.sendMessage(msg.chat.id,
      `⏳ 파이프라인 실행 중\n주제: "${activePipeline.topic}"\n대상: ${activePipeline.target}\n단계: ${activePipeline.stage}`);
  } else {
    bot.sendMessage(msg.chat.id, '💤 실행 중인 파이프라인 없음. /write 또는 /publish로 시작하세요.');
  }
});

// /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
`📖 *블로그 자동화 봇*

*발행 대상 선택:*
\`blogger\` — Blogger에만 발행
\`tistory\` — 티스토리에만 발행
\`both\` — 둘 다 발행 (기본값)

*명령어:*
/write \\[대상\\] \\<주제\\> — 초안 작성
/publish \\[대상\\] \\<주제\\> — 즉시 발행
/status — 진행 상태 확인
/help — 도움말

*예시:*
/write AI safety in education
/write tistory 내가 만든 블로그 자동화 앱
/publish both quantum computing 2025
/write blogger The future of AGI

*티스토리 카테고리 (자동 감지):*
📰 AI 뉴스 — news, update, report 관련 주제
🛠️ 내가 만든 프로그램들 — project, app, tool 관련
📝 AI 활용 기록 — 기타 모든 주제 (기본)

*파이프라인 단계:*
🔍 리서치 → 🖼️ 이미지 → ✍️ 글작성 → 📤 발행`, { parse_mode: 'Markdown' });
});

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`👋 블로그 자동화 봇에 오신 것을 환영합니다!

/write <주제> — Blogger + 티스토리에 초안 작성
/publish <주제> — Blogger + 티스토리에 즉시 발행

특정 플랫폼만: /write tistory <주제>

/help로 전체 사용법을 확인하세요.`);
});

// ──────────────────────────────────────────────
// Pipeline handler
// ──────────────────────────────────────────────

async function handlePipeline(chatId, topic, { isDraft, target }) {
  if (activePipeline) {
    bot.sendMessage(chatId,
      `⚠️ 이미 실행 중: "${activePipeline.topic}"\n/status로 진행 상태를 확인하세요.`);
    return;
  }

  activePipeline = { topic, target, stage: 'starting', chatId };
  const mode = isDraft ? '초안' : '발행';
  const targetLabel = { blogger: 'Blogger', tistory: '티스토리', both: 'Blogger + 티스토리' }[target] || target;

  const statusMsg = await bot.sendMessage(chatId,
    `🚀 파이프라인 시작 (${mode} / ${targetLabel})\n"${topic}"\n\n⏳ 초기화 중...`);

  const updateStatus = async (stage, message) => {
    activePipeline.stage = stage;
    try {
      await bot.editMessageText(
        `🚀 파이프라인 (${mode} / ${targetLabel})\n"${topic}"\n\n${message}`,
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
    } catch {
      // ignore identical-content edit errors
    }
  };

  try {
    const results = await runPipeline(topic, { isDraft, target, onProgress: updateStatus });

    const resultLines = results.map((r) => {
      const platformLabel = r.platform === 'tistory' ? '티스토리' : 'Blogger';
      const urlLine = r.isDraft
        ? `${platformLabel}: 초안 저장됨 (대시보드 확인)`
        : `${platformLabel}: ${r.url}`;
      return urlLine;
    }).join('\n');

    await bot.sendMessage(chatId,
      `✅ *완료!*\n\n📝 "${results[0]?.title}"\n\n${resultLines}`,
      { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Bot] Pipeline error:', err);
    await bot.sendMessage(chatId,
      `❌ 파이프라인 실패 (단계: ${activePipeline.stage})\n\n오류: ${err.message}`);
  } finally {
    activePipeline = null;
  }
}

process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down...');
  bot.stopPolling();
  process.exit(0);
});
