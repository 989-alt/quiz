import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Download, Trash2, Plus, Check, RefreshCw, X, RotateCcw, Key, FileSpreadsheet, Loader2, Layers, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { analyzeVideos, analyzeFileWithGemini, analyzeYoutubeWithGemini, generateQuizClient } from './api.js';

const CLIENT_TEXT = ['pptx', 'xlsx', 'xls', 'csv', 'txt'];
const CLIENT_GEMINI = ['pdf', 'hwpx', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
const SERVER_ONLY = ['mp4', 'avi', 'mov', 'webm'];
const ALL_ACCEPT = [...CLIENT_TEXT, ...CLIENT_GEMINI, 'hwp', ...SERVER_ONLY].map(e => `.${e}`).join(',');
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const LEVELS = [
  { value: 'elementary', label: '초등학교', hint: '초등학생 수준. 쉽고 친근한 언어. 변수(x,y,z) 대신 □, △, ○ 사용.' },
  { value: 'middle', label: '중학교', hint: '중학생 수준. 교과서 용어 사용 가능. 기본 변수 허용. 개념 이해와 적용력 측정.' },
  { value: 'high', label: '고등학교', hint: '고등학생 수준. 전문 용어와 심화 개념. 분석·추론·비판적 사고 요구.' },
];

const SUBJECTS = [
  { value: 'default', label: '일반', hint: '핵심 개념 이해도 측정.' },
  { value: 'math', label: '수학', hint: '수와 연산, 도형, 측정, 규칙성, 자료 해석.' },
  { value: 'science', label: '과학', hint: '실험 과정, 과학적 원리, 관찰 결과 중심.' },
  { value: 'korean', label: '국어', hint: '지문 내용 이해, 어휘, 글의 구조와 표현 기법.' },
  { value: 'english', label: '영어', hint: '어휘, 문법, 독해, 의사소통 기능 중심.' },
  { value: 'social', label: '사회', hint: '역사, 지리, 사회 현상의 이해.' },
  { value: 'moral', label: '도덕', hint: '윤리적 판단, 가치관, 시민 의식.' },
  { value: 'music', label: '음악', hint: '음악 이론, 악기, 작곡가, 감상.' },
  { value: 'art', label: '미술', hint: '미술 작품 감상, 표현 기법, 미술사.' },
  { value: 'pe', label: '체육', hint: '운동 원리, 스포츠 규칙, 건강과 체력.' },
  { value: 'practical', label: '실과', hint: '기술·가정, 정보 활용, 진로 탐색.' },
];

const BlooketGenerator = () => {
  const [step, setStep] = useState(() => localStorage.getItem('quiz_questions') ? 3 : 1);
  const [textContent, setTextContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('quiz_api_key') || '');
  const [subject, setSubject] = useState('default');
  const [level, setLevel] = useState('elementary');
  const [questions, setQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quiz_questions')) || []; } catch { return []; }
  });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (userApiKey) localStorage.setItem('quiz_api_key', userApiKey);
    else localStorage.removeItem('quiz_api_key');
  }, [userApiKey]);

  useEffect(() => {
    if (questions.length > 0) localStorage.setItem('quiz_questions', JSON.stringify(questions));
    else localStorage.removeItem('quiz_questions');
  }, [questions]);

  useEffect(() => {
    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.body.appendChild(s);
    });
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
    ]).then(() => setLibraryLoaded(true))
      .catch(() => setError("라이브러리 로드 실패. 새로고침 해주세요."));
  }, []);

  // Auto-expand API key section if no key saved
  useEffect(() => {
    if (!userApiKey) setShowApiKey(true);
  }, []);

  // --- Drag & Drop ---
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processNewFiles(files);
  }, [uploadedFiles, userApiKey]);

  // --- Client-side parsers ---
  const extractPPTX = async (file) => {
    if (!window.JSZip) return '[PPT 파서 로딩 중...]';
    try {
      const zip = await new window.JSZip().loadAsync(file);
      const slides = Object.keys(zip.files)
        .filter(n => n.startsWith("ppt/slides/slide") && n.endsWith(".xml"))
        .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));
      let text = "";
      for (const s of slides) {
        const xml = await zip.files[s].async("text");
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const nodes = doc.getElementsByTagName("a:t");
        let t = "";
        for (let i = 0; i < nodes.length; i++) t += nodes[i].textContent + " ";
        if (t.trim()) text += t.trim() + "\n";
      }
      return text || '[텍스트 없음]';
    } catch (e) { return `[PPTX 오류: ${e.message}]`; }
  };

  const extractExcel = async (file) => {
    if (!window.XLSX) return '[Excel 파서 로딩 중...]';
    try {
      const wb = window.XLSX.read(await file.arrayBuffer());
      return wb.SheetNames.map(n => `[${n}]\n${window.XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n');
    } catch (e) { return `[Excel 오류: ${e.message}]`; }
  };

  const extractHWPX = async (file) => {
    if (!window.JSZip) return '[HWPX 파서 로딩 중...]';
    try {
      const zip = await new window.JSZip().loadAsync(file);
      const sections = Object.keys(zip.files)
        .filter(f => f.startsWith('Contents/section') && f.endsWith('.xml')).sort();
      const texts = [];
      for (const sec of sections) {
        const xml = await zip.files[sec].async("text");
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const allEl = doc.getElementsByTagName('*');
        for (let i = 0; i < allEl.length; i++) {
          const tag = allEl[i].tagName;
          if ((tag === 'hp:t' || tag.endsWith(':t')) && allEl[i].textContent)
            texts.push(allEl[i].textContent);
        }
      }
      return texts.join('\n') || '[HWPX에서 텍스트를 찾지 못했습니다]';
    } catch (e) { return `[HWPX 오류: ${e.message}]`; }
  };

  // --- Process files ---
  const processFiles = async (files) => {
    let combinedText = "";
    const videoFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop().toLowerCase();
      setLoadingMsg(`파일 분석 중... (${i + 1}/${files.length}) ${file.name}`);

      if (ext === 'pptx') {
        combinedText += `\n--- [파일: ${file.name}] ---\n${await extractPPTX(file)}\n`;
      } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
        combinedText += `\n--- [파일: ${file.name}] ---\n${await extractExcel(file)}\n`;
      } else if (ext === 'txt') {
        combinedText += `\n--- [파일: ${file.name}] ---\n${await file.text()}\n`;
      } else if (ext === 'hwpx') {
        combinedText += `\n--- [파일: ${file.name}] ---\n${await extractHWPX(file)}\n`;
      } else if (ext === 'hwp') {
        combinedText += `\n--- [파일: ${file.name}] ---\n⚠️ HWP(구형)은 HWPX로 다시 저장 후 업로드해주세요.\n`;
      } else if (CLIENT_GEMINI.includes(ext)) {
        if (!userApiKey) {
          combinedText += `\n--- [파일: ${file.name}] ---\n⚠️ ${ext.toUpperCase()} 분석에는 API 키가 필요합니다.\n`;
          continue;
        }
        try {
          setLoadingMsg(`AI 분석 중... (${i + 1}/${files.length}) ${file.name}`);
          const analysis = await analyzeFileWithGemini(userApiKey, file,
            `이 ${ext === 'pdf' ? '문서' : '이미지'}의 내용을 교육용 퀴즈 출제에 적합하게 정리해주세요. 핵심 개념, 정의, 중요 사실을 한국어로 추출하세요.`
          );
          combinedText += `\n--- [파일: ${file.name}] ---\n${analysis}\n`;
        } catch (err) {
          combinedText += `\n--- [파일: ${file.name}] ---\n⚠️ 분석 실패: ${err.message}\n`;
        }
      } else if (SERVER_ONLY.includes(ext)) {
        videoFiles.push(file);
      } else {
        combinedText += `\n--- [파일: ${file.name}] ---\n⚠️ 지원하지 않는 형식입니다.\n`;
      }
    }

    // Process video files via backend (server needed for uploaded videos)
    if (videoFiles.length > 0) {
      if (!userApiKey) {
        for (const f of videoFiles)
          combinedText += `\n--- [파일: ${f.name}] ---\n⚠️ 영상 분석에는 API 키가 필요합니다.\n`;
      } else {
        setLoadingMsg(`영상 ${videoFiles.length}개를 서버에서 분석 중... (2-3분 소요)`);
        try {
          const result = await analyzeVideos(userApiKey, videoFiles, '');
          if (result.text) combinedText += `\n${result.text}\n`;
        } catch (err) {
          const isNetwork = err.message.includes('fetch') || err.message.includes('Failed');
          const msg = isNetwork
            ? '영상 분석 서버에 연결할 수 없습니다. 영상 외 기능은 정상 동작합니다.'
            : `영상 분석 실패: ${err.message}`;
          for (const f of videoFiles)
            combinedText += `\n--- [파일: ${f.name}] ---\n⚠️ ${msg}\n`;
        }
      }
    }

    // Process YouTube URL directly via Gemini (no backend needed)
    const hasYoutube = youtubeUrl.trim().length > 0;
    if (hasYoutube) {
      if (!userApiKey) {
        combinedText += `\n--- [YouTube] ---\n⚠️ YouTube 분석에는 API 키가 필요합니다.\n`;
      } else {
        setLoadingMsg('YouTube 영상 분석 중... (1-2분 소요)');
        try {
          const analysis = await analyzeYoutubeWithGemini(userApiKey, youtubeUrl);
          combinedText += `\n--- [YouTube: ${youtubeUrl}] ---\n${analysis}\n`;
        } catch (err) {
          combinedText += `\n--- [YouTube: ${youtubeUrl}] ---\n⚠️ YouTube 분석 실패: ${err.message}\n`;
        }
      }
    }

    return combinedText;
  };

  // --- Handlers ---
  const processNewFiles = async (newFiles) => {
    if (uploadedFiles.length + newFiles.length > 10) {
      setError("최대 10개까지 업로드 가능합니다."); return;
    }
    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) { setError(`${f.name}이(가) 너무 큽니다 (최대 50MB)`); return; }
    }
    setError('');
    const allFiles = [...uploadedFiles.map(f => f.file), ...newFiles];
    setUploadedFiles(allFiles.map(f => ({ file: f, name: f.name })));
    try {
      const text = await processFiles(allFiles);
      if (!text.trim()) setError("파일에서 텍스트를 찾을 수 없습니다.");
      else setTextContent(text.length > 50000 ? text.slice(0, 50000) + "\n..." : text);
    } catch (err) { setError("파일 처리 오류: " + err.message); }
    finally { setLoadingMsg(''); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleFileUpload = (e) => processNewFiles(Array.from(e.target.files));

  const handleRemoveFile = async (idx) => {
    const remaining = uploadedFiles.filter((_, i) => i !== idx);
    setUploadedFiles(remaining);
    if (remaining.length === 0) { setTextContent(''); return; }
    try {
      setLoadingMsg('파일 재분석 중...');
      setTextContent(await processFiles(remaining.map(f => f.file)) || '');
    } catch (err) { setError("오류: " + err.message); }
    finally { setLoadingMsg(''); }
  };

  const clearFiles = () => {
    setUploadedFiles([]); setTextContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getLevelHint = () => {
    const l = LEVELS.find(x => x.value === level);
    const s = SUBJECTS.find(x => x.value === subject);
    return `**학교급**: ${l?.hint || ''}\n**과목**: ${s?.hint || ''}`;
  };

  const handleGenerate = async () => {
    if (!textContent) { setError("텍스트가 없습니다."); return; }
    if (!userApiKey) { setError("API 키를 입력해주세요."); setShowApiKey(true); return; }
    setStep(2); setError('');
    const count = parseInt(questionCount, 10) || 10;
    setLoadingMsg("퀴즈 생성 중...");
    try {
      const data = await generateQuizClient(userApiKey, textContent, count, getLevelHint(), (ev) => {
        setLoadingMsg(`문제 생성 중... (${ev.generated}/${ev.total}) — 배치 ${ev.batch}/${ev.totalBatches}`);
      });
      setQuestions(data.map((q, i) => ({ ...q, id: i + 1 })));
      setStep(3);
    } catch (err) {
      setError("퀴즈 생성 실패: " + err.message);
      setStep(1);
    }
  };

  const handleRegenerateSingle = async (id) => {
    if (!userApiKey) { alert("API 키가 필요합니다."); return; }
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, isRegenerating: true } : q));
    try {
      const arr = await generateQuizClient(userApiKey, textContent, 1, getLevelHint());
      if (arr.length > 0)
        setQuestions(prev => prev.map(q => q.id === id ? { ...arr[0], id, isRegenerating: false } : q));
    } catch {
      alert("재생성 실패.");
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, isRegenerating: false } : q));
    }
  };

  const handleUpdateQuestion = (id, field, value) =>
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  const handleUpdateAnswer = (id, idx, value) =>
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;
      const a = [...q.answers]; a[idx] = value;
      return { ...q, answers: a };
    }));
  const handleDelete = (id) => setQuestions(questions.filter(q => q.id !== id));
  const handleAdd = () => setQuestions([...questions, {
    id: Date.now(), question: "새로운 문제", answers: ["1", "2", "3", "4"], correctAnswer: 1, timeLimit: 20
  }]);

  const downloadCSV = () => {
    const h1 = ['"Blooket\nImport Template"',"","","","","","",""].join(",");
    const h2 = ["Question #","Question Text","Answer 1","Answer 2",'"Answer 3\n(Optional)"','"Answer 4\n(Optional)"','"Time Limit (sec)\n(Max: 300 seconds)"','"Correct Answer(s)\n(Only include Answer #)"'].join(",");
    const rows = questions.map((q, i) => {
      const c = t => t == null ? '""' : `"${String(t).replace(/"/g, '""')}"`;
      return [i+1,c(q.question),c(q.answers[0]||""),c(q.answers[1]||""),c(q.answers[2]||""),c(q.answers[3]||""),q.timeLimit||20,q.correctAnswer||1].join(",");
    });
    const blob = new Blob(["\uFEFF"+[h1,h2,...rows].join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "blooket_quiz.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasApiKey = userApiKey.trim().length > 0;
  const canGenerate = textContent.trim().length > 0 && hasApiKey;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 font-sans text-slate-800 p-3 md:p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200">

        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
              <span className="text-xl font-black text-white">Q</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">퀴즈 생성기</h1>
              <p className="text-indigo-200 text-xs mt-0.5">PDF · PPT · HWPX · 이미지 · 영상</p>
            </div>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full border ${libraryLoaded ? 'bg-green-500/20 border-green-400/50 text-green-100' : 'bg-white/10 border-white/20'}`}>
            {libraryLoaded ? "준비 완료" : "로딩 중..."}
          </div>
        </header>

        <div className="p-5 md:p-7">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">

              {/* API Key - Collapsible */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold text-sm">API Key</span>
                    {hasApiKey && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">설정됨</span>}
                    {!hasApiKey && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">필요</span>}
                  </div>
                  {showApiKey ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showApiKey && (
                  <div className="px-4 py-4 border-t border-slate-200 space-y-3">
                    <input
                      type="password"
                      value={userApiKey}
                      onChange={e => setUserApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span>Google AI Studio에서 무료 발급 가능</span>
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                        className="text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 font-medium">
                        키 발급받기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5">
                <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  자료 업로드
                  <span className="text-xs text-slate-400 font-normal">최대 10개 · 파일당 50MB</span>
                </h2>

                {uploadedFiles.length === 0 ? (
                  <div
                    ref={dropRef}
                    onClick={() => fileInputRef.current.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                        : 'border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex justify-center gap-3 mb-3">
                      <Layers className="w-8 h-8 text-indigo-400" />
                      <FileSpreadsheet className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-slate-700 font-bold">
                      {isDragging ? '여기에 놓으세요!' : '클릭 또는 드래그하여 파일 선택'}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">PPT, Excel, PDF, TXT, HWPX, 이미지, 영상</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept={ALL_ACCEPT} />
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`bg-white border rounded-xl p-4 transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200'}`}
                  >
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                      <span className="font-semibold text-slate-700 text-sm">{uploadedFiles.length}개 파일 · {textContent.length.toLocaleString()}자</span>
                      <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current.click()} className="text-indigo-500 hover:text-indigo-700 text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> 추가</button>
                        <button onClick={clearFiles} className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1"><X className="w-3 h-3" /> 전체 삭제</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {uploadedFiles.map((f, i) => {
                        const ext = f.name.split('.').pop().toLowerCase();
                        const colors = CLIENT_TEXT.includes(ext) ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : CLIENT_GEMINI.includes(ext) ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200';
                        return (
                          <span key={i} className={`${colors} pl-2.5 pr-1 py-1 rounded-full text-xs border flex items-center gap-1`}>
                            {f.name}
                            <button onClick={() => handleRemoveFile(i)} className="ml-0.5 p-0.5 rounded-full hover:bg-black/10"><X className="w-3 h-3" /></button>
                          </span>
                        );
                      })}
                    </div>
                    {loadingMsg && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" /><p className="text-sm text-indigo-700 font-medium">{loadingMsg}</p></div>}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept={ALL_ACCEPT} />
                  </div>
                )}

                {/* Raw text toggle */}
                {textContent && (
                  <div className="mt-3">
                    <button onClick={() => setShowRawText(!showRawText)}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showRawText ? '텍스트 숨기기' : '추출된 텍스트 보기 / 직접 편집'}
                    </button>
                    {showRawText && (
                      <textarea className="w-full h-32 mt-2 p-3 rounded-lg border border-slate-200 outline-none resize-none text-xs font-mono text-slate-600 focus:ring-1 focus:ring-indigo-300"
                        value={textContent} onChange={e => setTextContent(e.target.value)} />
                    )}
                  </div>
                )}

                {/* YouTube URL */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 shrink-0">
                    <span className="text-red-500 text-lg leading-none">▶</span>
                    <span className="font-medium">YouTube</span>
                  </div>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-300"
                  />
                  {youtubeUrl && (
                    <>
                      <button
                        disabled={!!loadingMsg}
                        onClick={async () => {
                          if (!userApiKey) { setError('API 키가 필요합니다.'); return; }
                          setError('');
                          setLoadingMsg('YouTube 영상 분석 중... (1-2분 소요)');
                          try {
                            const analysis = await analyzeYoutubeWithGemini(userApiKey, youtubeUrl);
                            setTextContent(prev => prev + `\n--- [YouTube: ${youtubeUrl}] ---\n${analysis}\n`);
                          } catch (err) {
                            setError('YouTube 분석 실패: ' + err.message);
                          } finally { setLoadingMsg(''); }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 flex items-center gap-1 ${loadingMsg ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                      >{loadingMsg ? <><Loader2 className="w-3 h-3 animate-spin" />분석 중...</> : '분석'}</button>
                      <button onClick={() => setYoutubeUrl('')} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Direct text input when no files */}
                {uploadedFiles.length === 0 && (
                  <div className="mt-3">
                    <textarea className="w-full h-24 p-3 rounded-lg border border-slate-200 outline-none resize-none text-sm text-slate-600 focus:ring-1 focus:ring-indigo-300"
                      placeholder="파일 없이 텍스트를 직접 붙여넣을 수도 있습니다."
                      value={textContent} onChange={e => setTextContent(e.target.value)} />
                  </div>
                )}

                {/* Controls */}
                <div className="mt-4 grid grid-cols-3 gap-3 md:flex md:items-center md:gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 mb-1">학교급</label>
                    <select value={level} onChange={e => setLevel(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-indigo-300 outline-none">
                      {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 mb-1">과목</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-indigo-300 outline-none">
                      {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 mb-1">문항 수</label>
                    <input type="number" min="1" max="50" value={questionCount}
                      onChange={e => setQuestionCount(parseInt(e.target.value, 10) || 1)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-indigo-600 bg-white focus:ring-1 focus:ring-indigo-300 outline-none w-full" />
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm font-medium mt-3">{error}</p>}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-lg ${
                  canGenerate
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-5 h-5" />
                퀴즈 생성하기
              </button>
              {!canGenerate && (
                <p className="text-center text-xs text-slate-400 -mt-3">
                  {!hasApiKey ? 'API 키를 먼저 입력해주세요' : '파일을 업로드하거나 텍스트를 입력해주세요'}
                </p>
              )}
            </div>
          )}

          {/* STEP 2: Loading */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-200 border-t-indigo-600"></div>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-6">{loadingMsg}</h2>
              <p className="text-slate-400 text-sm mt-2">자료를 분석하여 최적의 문제를 만들고 있습니다.</p>
            </div>
          )}

          {/* STEP 3: Results */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">생성 결과 <span className="text-indigo-600">{questions.length}</span>문제</h2>
                <div className="flex gap-2">
                  <button onClick={() => { setStep(1); setQuestions([]); }}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5"/> 처음으로
                  </button>
                  <button onClick={handleAdd}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5"/> 추가
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-slate-200 p-4 rounded-xl bg-white hover:shadow-md transition-shadow relative">
                    {q.isRegenerating && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      </div>
                    )}
                    <div className="flex gap-3 mb-3">
                      <span className="font-bold text-indigo-600 text-sm shrink-0 pt-1">Q{idx+1}</span>
                      <input className="flex-1 font-semibold border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-sm py-1"
                        value={q.question} onChange={e => handleUpdateQuestion(q.id, 'question', e.target.value)} />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleRegenerateSingle(q.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="다시 만들기">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {q.answers.map((ans, aIdx) => (
                        <div key={aIdx}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            q.correctAnswer === aIdx+1 ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleUpdateQuestion(q.id, 'correctAnswer', aIdx+1)}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            q.correctAnswer === aIdx+1 ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'
                          }`}>
                            {q.correctAnswer === aIdx+1 && <Check className="w-3 h-3"/>}
                          </div>
                          <input className="flex-1 bg-transparent outline-none text-sm"
                            value={ans} onChange={e => { e.stopPropagation(); handleUpdateAnswer(q.id, aIdx, e.target.value); }}
                            onClick={e => e.stopPropagation()} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={downloadCSV}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Download className="w-5 h-5" /> CSV 다운로드
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlooketGenerator;
