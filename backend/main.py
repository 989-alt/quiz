import os
import json
import traceback
import asyncio
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
import tempfile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # GitHub Pages + localhost 모두 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Level descriptions
LEVEL_PROMPTS = {
    "elementary": "초등학생 수준. 쉽고 친근한 언어. 변수(x,y,z) 대신 □, △, ○ 사용. '×' '÷' 기호 사용.",
    "middle": "중학생 수준. 교과서 용어 사용 가능. 기본 변수(x, y) 허용. 개념 이해와 적용력 측정.",
    "high": "고등학생 수준. 전문 용어와 심화 개념 사용. 분석·추론·비판적 사고를 요구하는 문제.",
}

# Subject prompts
SUBJECT_PROMPTS = {
    "math": "수학: 수와 연산, 도형, 측정, 규칙성, 자료 해석. 풀이 과정의 논리적 사고를 묻는 문제 위주.",
    "science": "과학: 실험 과정, 과학적 원리, 관찰 결과 중심. 단순 암기보다 '왜'를 묻는 문제.",
    "korean": "국어: 지문 내용 이해, 어휘의 뜻, 글의 구조와 표현 기법 중심.",
    "english": "영어: 어휘, 문법, 독해, 의사소통 기능 중심. 영어 지문이 있으면 영어로 출제 가능.",
    "social": "사회: 역사적 사건의 원인과 결과, 지리적 특징, 사회 현상의 이해.",
    "moral": "도덕: 윤리적 판단, 가치관, 도덕적 딜레마, 시민 의식 관련 문제.",
    "music": "음악: 음악 이론, 악기, 작곡가, 음악 감상, 리듬과 선율 이해.",
    "art": "미술: 미술 작품 감상, 표현 기법, 미술사, 색채와 구도 이해.",
    "pe": "체육: 운동 원리, 스포츠 규칙, 건강과 체력, 경기 전략.",
    "practical": "실과: 기술·가정 영역. 생활 기술, 정보 활용, 진로 탐색, 실생활 적용.",
    "default": "일반: 핵심 개념 이해도 측정. 단순 암기보다 개념 적용력을 묻는 문제."
}


def get_level_and_subject_hint(subject_param: str) -> str:
    """Parse 'level_subject' format and return combined hint."""
    parts = subject_param.split("_", 1)
    if len(parts) == 2:
        level_key, subject_key = parts
    else:
        level_key, subject_key = "elementary", parts[0]

    level_hint = LEVEL_PROMPTS.get(level_key, LEVEL_PROMPTS["elementary"])
    subject_hint = SUBJECT_PROMPTS.get(subject_key, SUBJECT_PROMPTS["default"])
    return f"**학교급**: {level_hint}\n**과목**: {subject_hint}"

# MIME types
MIME_TYPES = {
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
}

HWPX_NAMESPACES = {
    'hp': 'http://www.hancom.co.kr/hwpml/2011/paragraph',
    'hs': 'http://www.hancom.co.kr/hwpml/2011/section',
}


def get_youtube_video_id(url: str) -> Optional[str]:
    patterns = [
        r'(?:v=|/)([0-9A-Za-z_-]{11})(?:[&?]|$)',
        r'(?:embed/)([0-9A-Za-z_-]{11})',
        r'(?:youtu\.be/)([0-9A-Za-z_-]{11})',
        r'(?:shorts/)([0-9A-Za-z_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_youtube_transcript(video_id: str) -> Optional[str]:
    """Get YouTube transcript using youtube_transcript_api."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Try Korean first, then auto-generated Korean, then any available
        transcript = None
        for lang in ['ko', 'en']:
            try:
                transcript = transcript_list.find_transcript([lang])
                break
            except Exception:
                continue

        if transcript is None:
            try:
                generated = transcript_list.find_generated_transcript(['ko', 'en'])
                transcript = generated
            except Exception:
                # Get whatever is available
                for t in transcript_list:
                    transcript = t
                    break

        if transcript is None:
            return None

        entries = transcript.fetch()
        text_parts = [entry.text for entry in entries]
        return "\n".join(text_parts)
    except Exception as e:
        print(f"YouTube transcript error: {e}")
        return None


def extract_pdf_text(file_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text.strip()
    except Exception as e:
        print(f"PDF text extraction error: {e}")
        return ""


def extract_hwpx_text(file_path: str) -> str:
    """Extract text from HWPX file (ZIP-based Korean word processor format)."""
    try:
        text_parts = []
        with zipfile.ZipFile(file_path, 'r') as z:
            section_files = sorted(
                [f for f in z.namelist()
                 if f.startswith('Contents/section') and f.endswith('.xml')],
                key=lambda x: int(re.search(r'section(\d+)\.xml', x).group(1))
                if re.search(r'section(\d+)\.xml', x) else 0
            )

            for section_file in section_files:
                with z.open(section_file) as f:
                    tree = ET.parse(f)
                    root = tree.getroot()

                    # Extract text from hp:t tags
                    for t_elem in root.iter('{http://www.hancom.co.kr/hwpml/2011/paragraph}t'):
                        if t_elem.text:
                            text_parts.append(t_elem.text)

                    # Also try without namespace (some HWPX versions)
                    if not text_parts:
                        for t_elem in root.iter():
                            if t_elem.tag.endswith('}t') and t_elem.text:
                                text_parts.append(t_elem.text)

        return '\n'.join(text_parts)
    except Exception as e:
        print(f"HWPX extraction error: {e}")
        return ""


def extract_pptx_text(file_path: str) -> str:
    """Extract text from PPTX file server-side."""
    try:
        pptx_text = ""
        with zipfile.ZipFile(file_path, 'r') as z:
            slide_files = sorted(
                [n for n in z.namelist()
                 if n.startswith("ppt/slides/slide") and n.endswith(".xml")],
                key=lambda x: int(re.search(r'slide(\d+)\.xml', x).group(1))
                if re.search(r'slide(\d+)\.xml', x) else 0
            )
            for slide_name in slide_files:
                with z.open(slide_name) as sf:
                    tree = ET.parse(sf)
                    root = tree.getroot()
                    slide_texts = [
                        node.text
                        for node in root.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t')
                        if node.text
                    ]
                    if slide_texts:
                        pptx_text += " ".join(slide_texts) + "\n"
        return pptx_text.strip()
    except Exception as e:
        print(f"PPTX parsing error: {e}")
        return ""


async def upload_to_gemini(client: genai.Client, file_path: str, mime_type: str) -> Optional[object]:
    """Upload file to Gemini File API and wait for processing."""
    try:
        print(f"Uploading to Gemini: {file_path}")
        uploaded = client.files.upload(file=file_path, config={"mime_type": mime_type})
        print(f"Uploaded: {uploaded.name}, state: {uploaded.state}")

        max_wait = 180
        waited = 0
        while str(uploaded.state) == "PROCESSING" and waited < max_wait:
            print(f"Processing... ({waited}s)")
            await asyncio.sleep(5)
            waited += 5
            uploaded = client.files.get(name=uploaded.name)

        if str(uploaded.state) == "ACTIVE":
            print(f"File ready: {uploaded.name}")
            return uploaded
        else:
            print(f"Upload failed: {uploaded.state}")
            return None
    except Exception as e:
        print(f"Gemini upload error: {e}")
        traceback.print_exc()
        return None


async def summarize_long_text(client: genai.Client, texts_by_file: dict, budget_per_file: int = 2000) -> str:
    """When total text is too long, summarize each file's content for quiz generation."""
    combined = "\n\n".join(f"[{name}]\n{text}" for name, text in texts_by_file.items())
    total_len = sum(len(t) for t in texts_by_file.values())

    if total_len <= 15000:
        return combined

    print(f"Total text {total_len} chars, summarizing...")

    summary_prompt = f"""당신은 한국 초등학교 교육 전문가입니다.
아래는 여러 교육 자료에서 추출한 텍스트입니다.
각 자료별로 **퀴즈 출제에 필요한 핵심 내용**만 {budget_per_file}자 이내로 요약하세요.

요약 규칙:
1. 자료별로 [파일명] 헤더를 유지하세요
2. 핵심 개념, 정의, 중요 사실, 수치를 보존하세요
3. 예시나 부연설명은 제거하세요
4. 표나 수식의 핵심 내용은 텍스트로 설명하세요

자료:
{combined[:50000]}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=summary_prompt,
        )
        summarized = response.text
        print(f"Summarized to {len(summarized)} chars")
        return summarized
    except Exception as e:
        print(f"Summarization failed, using truncated original: {e}")
        result_parts = []
        for name, text in texts_by_file.items():
            ratio = len(text) / total_len
            chars = max(500, int(30000 * ratio))
            result_parts.append(f"[{name}]\n{text[:chars]}")
        return "\n\n".join(result_parts)


# --- Endpoints ---

@app.post("/api/analyze")
async def analyze_content(
    apiKey: str = Form(...),
    youtubeUrl: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
):
    """Analyze files and YouTube videos using Gemini."""

    if not apiKey:
        raise HTTPException(status_code=400, detail="API Key 필요")

    try:
        client = genai.Client(api_key=apiKey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API 오류: {e}")

    texts = []
    texts_by_file = {}
    gemini_files = []
    temp_paths = []

    try:
        for file in files:
            filename = file.filename
            suffix = os.path.splitext(filename)[1].lower()

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                temp_path = tmp.name
                temp_paths.append(temp_path)

            print(f"Processing: {filename} ({suffix})")
            mime_type = MIME_TYPES.get(suffix, file.content_type or 'application/octet-stream')

            # PDF
            if suffix == '.pdf':
                pdf_text = extract_pdf_text(temp_path)
                if pdf_text and len(pdf_text) > 100:
                    texts.append(f"📄 PDF: {filename}\n\n{pdf_text[:20000]}")
                    texts_by_file[filename] = pdf_text[:20000]
                else:
                    texts.append(f"📄 PDF (이미지): {filename} - Gemini로 분석 중...")
                    g_file = await upload_to_gemini(client, temp_path, mime_type)
                    if g_file:
                        gemini_files.append(g_file)
                    else:
                        texts.append(f"⚠️ PDF 분석 실패: {filename}")

            # HWP/HWPX — direct parsing
            elif suffix == '.hwpx':
                hwpx_text = extract_hwpx_text(temp_path)
                if hwpx_text and len(hwpx_text) > 50:
                    texts.append(f"📄 HWPX: {filename}\n\n{hwpx_text[:20000]}")
                    texts_by_file[filename] = hwpx_text[:20000]
                else:
                    texts.append(f"⚠️ HWPX 파일({filename})에서 텍스트를 추출하지 못했습니다.\n"
                               "→ 한글에서 [파일 > 다른 이름으로 저장 > PDF] 후 다시 시도해주세요.")

            elif suffix == '.hwp':
                texts.append(f"⚠️ HWP 파일({filename})은 구형 바이너리 형식입니다.\n"
                           "→ 한글에서 [파일 > 다른 이름으로 저장 > HWPX 또는 PDF] 후 다시 업로드해주세요.")

            # TXT
            elif suffix == '.txt':
                try:
                    with open(temp_path, 'r', encoding='utf-8') as f:
                        txt = f.read()
                except Exception:
                    with open(temp_path, 'r', encoding='cp949') as f:
                        txt = f.read()
                texts.append(f"📄 텍스트: {filename}\n\n{txt[:20000]}")
                texts_by_file[filename] = txt[:20000]

            # Images
            elif suffix in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                texts.append(f"🖼️ 이미지: {filename}")
                g_file = await upload_to_gemini(client, temp_path, mime_type)
                if g_file:
                    gemini_files.append(g_file)

            # Video
            elif suffix in ['.mp4', '.avi', '.mov', '.webm']:
                texts.append(f"🎬 영상: {filename} - Gemini로 분석 중... (1-2분 소요)")
                g_file = await upload_to_gemini(client, temp_path, mime_type)
                if g_file:
                    gemini_files.append(g_file)
                else:
                    texts.append(f"⚠️ 영상 분석 실패: {filename}")

            # PPTX
            elif suffix == '.pptx':
                pptx_text = extract_pptx_text(temp_path)
                if pptx_text:
                    texts.append(f"📊 PPTX: {filename}\n\n{pptx_text[:20000]}")
                    texts_by_file[filename] = pptx_text[:20000]
                else:
                    texts.append(f"📊 PPTX: {filename} (텍스트 없음)")

            # CSV
            elif suffix == '.csv':
                try:
                    with open(temp_path, 'r', encoding='utf-8') as f:
                        csv_text = f.read()
                except Exception:
                    with open(temp_path, 'r', encoding='cp949') as f:
                        csv_text = f.read()
                texts.append(f"📊 CSV: {filename}\n\n{csv_text[:20000]}")
                texts_by_file[filename] = csv_text[:20000]

            elif suffix in ['.xlsx', '.xls']:
                texts.append(f"📊 Excel: {filename} (클라이언트에서 파싱됨)")

            else:
                texts.append(f"📎 지원하지 않는 형식: {filename}")

        # === Process YouTube ===
        if youtubeUrl and youtubeUrl.strip():
            video_id = get_youtube_video_id(youtubeUrl)
            if video_id:
                texts.append(f"🎥 YouTube: {youtubeUrl}")

                try:
                    texts.append("⏳ 자막 추출 중...")
                    transcript = await asyncio.to_thread(get_youtube_transcript, video_id)

                    if transcript:
                        texts.append(f"✓ 자막 추출 완료 ({len(transcript)}자)")
                        texts_by_file[f"YouTube_{video_id}"] = transcript[:20000]
                    else:
                        texts.append("⚠️ 자막을 찾을 수 없습니다. 자막이 없는 영상이거나 비공개 영상일 수 있습니다.")
                except Exception as e:
                    print(f"YouTube processing error: {e}")
                    texts.append(f"⚠️ YouTube 처리 오류: {str(e)}")
            else:
                texts.append("⚠️ 올바른 YouTube URL이 아닙니다")

        # === Summarize if needed ===
        summarized_text = ""
        if texts_by_file:
            summarized_text = await summarize_long_text(client, texts_by_file)

        # === Generate AI Analysis ===
        if gemini_files or texts_by_file or any("📄" in t or "📊" in t for t in texts):
            prompt = """다음 자료의 내용을 분석하고 교육용 퀴즈를 만들기 좋게 정리해주세요.

분석 방법:
1. 영상이 있다면: 영상의 주제, 핵심 내용, 중요한 장면과 설명을 자세히 기술
2. 문서가 있다면: 핵심 개념, 정의, 중요 사실을 추출
3. 이미지가 있다면: 이미지 내용을 텍스트로 설명

결과물:
- 핵심 개념과 정의
- 중요한 사실과 정보
- 퀴즈 출제에 적합한 키워드

한국어로 상세하게 작성해주세요.

추출된 텍스트:
""" + (summarized_text or "\n\n".join(texts))

            content_parts = [prompt]
            content_parts.extend(gemini_files)

            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=content_parts,
                )

                result = "\n\n".join(texts)
                result += "\n\n" + "=" * 50 + "\n"
                result += "📚 AI 분석 결과\n"
                result += "=" * 50 + "\n\n"
                result += response.text

                return {"text": result}
            except Exception as e:
                print(f"Gemini generation error: {e}")
                combined = "\n\n".join(texts)
                combined += f"\n\n⚠️ AI 분석 오류: {str(e)}"
                return {"text": combined}
        else:
            return {"text": "\n\n".join(texts) if texts else "(분석할 파일이 없습니다.)"}

    except Exception as e:
        print(f"Analyze Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in temp_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
        for g_file in gemini_files:
            try:
                client.files.delete(name=g_file.name)
            except Exception:
                pass


def _generate_batch_sync(client: genai.Client, content_text: str, count: int, hint: str, existing_questions: list) -> list:
    """Generate a single batch of questions (synchronous for SSE streaming)."""

    existing_list = ""
    if existing_questions:
        existing_summaries = [f"- {q['question'][:80]}" for q in existing_questions[-30:]]
        existing_list = f"""
**이미 출제된 문제** (중복 금지):
{chr(10).join(existing_summaries)}
"""

    prompt = f"""당신은 한국 초등학교 교육 전문가입니다.
아래 내용을 바탕으로 정확히 {count}개의 퀴즈를 만드세요.

**과목 지침**: {hint}

**출제 규칙**:
1. **대상**: 초등학생. 쉽고 명확한 한국어 사용.
2. **변수 금지**: x, y, z 대신 □, △, ○ 사용. '×' '÷' 기호 사용.
3. **개념 중심**: "~슬라이드에 나온", "~텍스트에 따르면" 같은 메타 참조 금지.
4. **출처 다양성**: 여러 자료가 있다면, 모든 자료의 내용을 골고루 반영하세요. 한 자료에만 집중하지 마세요.
5. **4지선다**: 각 문제에 반드시 4개 선택지. 정답은 1~4 중 하나.
{existing_list}
**출력**: JSON 배열만! 다른 텍스트 없이!
**형식**: [{{"question": "문제", "answers": ["답1", "답2", "답3", "답4"], "correctAnswer": 1, "timeLimit": 20}}]

**내용**:
{content_text}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        text = response.text
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()

        data = json.loads(text)

        validated = []
        for i, q in enumerate(data):
            answers = q.get("answers", ["", "", "", ""])
            while len(answers) < 4:
                answers.append("")

            validated.append({
                "question": str(q.get("question", f"문제 {i + 1}"))[:500],
                "answers": [str(a)[:100] for a in answers[:4]],
                "correctAnswer": min(max(int(q.get("correctAnswer", 1)), 1), 4),
                "timeLimit": min(max(int(q.get("timeLimit", 20)), 5), 60)
            })

        return validated

    except json.JSONDecodeError as e:
        print(f"JSON decode error in batch: {e}")
        return []
    except Exception as e:
        print(f"Batch generation error: {e}")
        traceback.print_exc()
        return []


@app.post("/api/generate")
async def generate_quiz(
    apiKey: str = Form(...),
    questionCount: int = Form(10),
    textContent: str = Form(...),
    subject: str = Form("default"),
):
    """Generate quiz from text — single batch for <=15, otherwise returns all at once."""

    if not apiKey:
        raise HTTPException(status_code=400, detail="API Key 필요")
    if not textContent.strip():
        raise HTTPException(status_code=400, detail="내용 필요")

    try:
        client = genai.Client(api_key=apiKey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 오류: {e}")

    hint = get_level_and_subject_hint(subject)
    content_text = textContent[:30000]

    BATCH_SIZE = 15
    all_questions = []

    if questionCount <= BATCH_SIZE:
        questions = await asyncio.to_thread(
            _generate_batch_sync, client, content_text, questionCount, hint, []
        )
        all_questions.extend(questions)
    else:
        remaining = questionCount
        batch_num = 0
        while remaining > 0:
            batch_count = min(BATCH_SIZE, remaining)
            batch_num += 1
            print(f"Generating batch {batch_num}: {batch_count} questions (already have {len(all_questions)})")

            questions = await asyncio.to_thread(
                _generate_batch_sync, client, content_text, batch_count, hint, all_questions
            )
            all_questions.extend(questions)
            remaining -= len(questions)

            if len(questions) == 0:
                print("Batch returned 0 questions, stopping")
                break

    return all_questions


@app.post("/api/generate-stream")
async def generate_quiz_stream(
    apiKey: str = Form(...),
    questionCount: int = Form(10),
    textContent: str = Form(...),
    subject: str = Form("default"),
):
    """Generate quiz with SSE streaming for real-time progress updates."""

    if not apiKey:
        raise HTTPException(status_code=400, detail="API Key 필요")
    if not textContent.strip():
        raise HTTPException(status_code=400, detail="내용 필요")

    try:
        client = genai.Client(api_key=apiKey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 오류: {e}")

    hint = get_level_and_subject_hint(subject)
    content_text = textContent[:30000]

    BATCH_SIZE = 15

    async def event_stream():
        all_questions = []
        total_batches = max(1, (questionCount + BATCH_SIZE - 1) // BATCH_SIZE)

        if questionCount <= BATCH_SIZE:
            # Single batch
            yield f"data: {json.dumps({'type': 'progress', 'batch': 1, 'totalBatches': 1, 'generated': 0, 'total': questionCount}, ensure_ascii=False)}\n\n"

            questions = await asyncio.to_thread(
                _generate_batch_sync, client, content_text, questionCount, hint, []
            )
            all_questions.extend(questions)

            yield f"data: {json.dumps({'type': 'batch', 'questions': questions, 'generated': len(all_questions), 'total': questionCount}, ensure_ascii=False)}\n\n"
        else:
            remaining = questionCount
            batch_num = 0
            while remaining > 0:
                batch_count = min(BATCH_SIZE, remaining)
                batch_num += 1

                yield f"data: {json.dumps({'type': 'progress', 'batch': batch_num, 'totalBatches': total_batches, 'generated': len(all_questions), 'total': questionCount}, ensure_ascii=False)}\n\n"

                questions = await asyncio.to_thread(
                    _generate_batch_sync, client, content_text, batch_count, hint, all_questions
                )
                all_questions.extend(questions)
                remaining -= len(questions)

                yield f"data: {json.dumps({'type': 'batch', 'questions': questions, 'generated': len(all_questions), 'total': questionCount}, ensure_ascii=False)}\n\n"

                if len(questions) == 0:
                    break

        yield f"data: {json.dumps({'type': 'done', 'questions': all_questions, 'total': len(all_questions)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/")
def root():
    return {"status": "ok", "message": "Quiz Generator 2.0 - Multi-Modal"}
