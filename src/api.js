// Backend is only needed for video/YouTube analysis
// Configure VITE_API_URL for production (e.g., Render URL)
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Send video files or YouTube URL to backend for analysis.
 * Only used for video — PDF/images/HWPX are handled client-side.
 */
export async function analyzeVideos(apiKey, files, youtubeUrl = '') {
  const formData = new FormData();
  formData.append('apiKey', apiKey);
  if (youtubeUrl) formData.append('youtubeUrl', youtubeUrl);
  for (const file of files) {
    formData.append('files', file);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      body: formData,
    });
  } catch (e) {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.');
  }

  if (!res.ok) {
    if (res.status === 500) {
      throw new Error('500 서버 오류 — 백엔드가 실행 중인지 확인해주세요.');
    }
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `서버 오류: ${res.status}`);
  }

  return res.json();
}

// --- Client-side Gemini API helpers ---

/**
 * Read a File as base64 data URL string.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // strip "data:...;base64,"
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Gemini API to analyze a file (PDF or image) using inline_data.
 * Returns extracted text/analysis as a string.
 */
export async function analyzeFileWithGemini(apiKey, file, prompt) {
  const base64 = await fileToBase64(file);
  const ext = file.name.split('.').pop().toLowerCase();

  const mimeMap = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp',
  };
  const mimeType = mimeMap[ext] || file.type || 'application/octet-stream';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } }
          ]
        }]
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Generate quiz questions via Gemini API (client-side).
 * Supports batch generation for large question counts.
 */
export async function generateQuizClient(apiKey, text, count, levelHint, onProgress) {
  const BATCH_SIZE = 15;
  const allQuestions = [];

  if (count <= BATCH_SIZE) {
    if (onProgress) onProgress({ generated: 0, total: count, batch: 1, totalBatches: 1 });
    const questions = await _generateBatch(apiKey, text, count, levelHint, []);
    allQuestions.push(...questions);
  } else {
    const totalBatches = Math.ceil(count / BATCH_SIZE);
    let remaining = count;
    let batchNum = 0;

    while (remaining > 0) {
      const batchCount = Math.min(BATCH_SIZE, remaining);
      batchNum++;

      if (onProgress) onProgress({ generated: allQuestions.length, total: count, batch: batchNum, totalBatches });

      const questions = await _generateBatch(apiKey, text, batchCount, levelHint, allQuestions);
      allQuestions.push(...questions);
      remaining -= questions.length;

      if (questions.length === 0) break; // safety
    }
  }

  return allQuestions;
}

async function _generateBatch(apiKey, text, count, levelHint, existingQuestions) {
  let existingList = "";
  if (existingQuestions.length > 0) {
    const summaries = existingQuestions.slice(-30).map(q => `- ${q.question.slice(0, 80)}`);
    existingList = `\n**이미 출제된 문제** (중복 금지):\n${summaries.join('\n')}\n`;
  }

  const prompt = `당신은 한국 교육 전문가입니다.
아래 내용을 바탕으로 정확히 ${count}개의 퀴즈를 만드세요.

${levelHint}

**출제 규칙**:
1. 학교급에 맞는 난이도와 언어 수준을 사용하세요.
2. 초등학교: 변수(x,y,z) 대신 □, △, ○ 사용. '×' '÷' 기호 사용.
3. "~슬라이드에 나온", "~텍스트에 따르면" 같은 메타 참조 금지.
4. 여러 자료가 있다면 모든 자료의 내용을 골고루 반영하세요.
5. 4지선다: 각 문제에 반드시 4개 선택지. 정답은 1~4 중 하나.
${existingList}
**출력**: JSON 배열만! 다른 텍스트 없이!
**형식**: [{"question": "문제", "answers": ["답1", "답2", "답3", "답4"], "correctAnswer": 1, "timeLimit": 20}]

**내용**:
${text.slice(0, 30000)}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const data = await response.json();
  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  rawText = rawText.replace(/^```json?\s*/, '').replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(rawText);
    return parsed.map((q, i) => {
      const answers = q.answers || ["", "", "", ""];
      while (answers.length < 4) answers.push("");
      return {
        question: String(q.question || `문제 ${i + 1}`).slice(0, 500),
        answers: answers.slice(0, 4).map(a => String(a).slice(0, 100)),
        correctAnswer: Math.min(Math.max(parseInt(q.correctAnswer) || 1, 1), 4),
        timeLimit: Math.min(Math.max(parseInt(q.timeLimit) || 20, 5), 60),
      };
    });
  } catch {
    console.error("JSON parse failed for batch");
    return [];
  }
}
