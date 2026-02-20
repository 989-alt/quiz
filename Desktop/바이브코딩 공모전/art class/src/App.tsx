import { useState, useCallback } from 'react';
import { useApiKey } from './hooks/useApiKey';
import { useGeneration } from './hooks/useGeneration';
import { useHistory } from './hooks/useHistory';
import type { GenerationConfig } from './types';

import Header from './components/common/Header';
import Toast from './components/common/Toast';
import ApiKeySetup from './components/Onboarding/ApiKeySetup';
import GeneratorForm from './components/Form/GeneratorForm';
import CanvasPreview from './components/Canvas/CanvasPreview';
import SkeletonLoader from './components/Canvas/SkeletonLoader';
import QuickEditBar from './components/Canvas/QuickEditBar';
import HistoryStack from './components/History/HistoryStack';
import ExportPanel from './components/Export/ExportPanel';

import './App.css';

export default function App() {
  const { apiKey, hasApiKey, isLoaded, setApiKey, clearApiKey } = useApiKey();
  const { currentImage, isLoading, generate, edit, setCurrentImage, toast, clearToast } = useGeneration();
  const { historyCount, maxDepth, canUndo, push, undo, clear } = useHistory();
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [gridN, setGridN] = useState(2);
  const [gridM, setGridM] = useState(2);

  const handleGenerate = useCallback(
    async (config: GenerationConfig) => {
      if (!apiKey) return;
      setGridN(config.gridN);
      setGridM(config.gridM);
      clear();
      await generate(apiKey, config);
    },
    [apiKey, generate, clear]
  );

  // Push to history whenever currentImage changes from generation
  const handleEdit = useCallback(
    async (editType: string) => {
      if (!apiKey || !currentImage) return;
      // Save current before edit
      push(currentImage);
      await edit(apiKey, editType);
    },
    [apiKey, currentImage, push, edit]
  );

  const handleUndo = useCallback(() => {
    const previousImage = undo();
    if (previousImage) {
      setCurrentImage(previousImage);
    }
  }, [undo, setCurrentImage]);

  const handleKeySet = useCallback(
    (key: string) => {
      setApiKey(key);
      setShowKeySetup(false);
    },
    [setApiKey]
  );

  const handleSettingsClick = useCallback(() => {
    setShowKeySetup(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearApiKey();
    setShowKeySetup(false);
  }, [clearApiKey]);

  // Wait for localStorage load
  if (!isLoaded) return null;

  // Show onboarding or key setup modal
  if (!hasApiKey || showKeySetup) {
    return (
      <>
        <Toast toast={toast} onClose={clearToast} />
        {showKeySetup && hasApiKey ? (
          <div className="key-modal-overlay" onClick={() => setShowKeySetup(false)}>
            <div className="key-modal" onClick={(e) => e.stopPropagation()}>
              <div className="key-modal__header">
                <h2>API 키 설정</h2>
                <button className="key-modal__close" onClick={() => setShowKeySetup(false)}>×</button>
              </div>
              <ApiKeySetup onKeySet={handleKeySet} />
              <button className="key-modal__logout" onClick={handleLogout}>
                🗑️ 키 삭제 및 로그아웃
              </button>
            </div>
          </div>
        ) : (
          <ApiKeySetup onKeySet={handleKeySet} />
        )}
      </>
    );
  }

  return (
    <div className="app">
      <Toast toast={toast} onClose={clearToast} />
      <Header apiKey={apiKey} onSettingsClick={handleSettingsClick} />

      <main className="workspace">
        {/* Left Panel */}
        <aside className="workspace__sidebar">
          <GeneratorForm
            isLoading={isLoading}
            onGenerate={handleGenerate}
          />
          <ExportPanel image={currentImage} gridN={gridN} gridM={gridM} />
        </aside>

        {/* Right Panel */}
        <section className="workspace__canvas">
          {!currentImage && !isLoading && (
            <div className="workspace__empty">
              <div className="workspace__empty-icon">🖌️</div>
              <h2>도안을 생성해 보세요</h2>
              <p>왼쪽 패널에서 모드, 주제, 난이도를 설정한 후<br />"도안 생성" 버튼을 클릭하세요.</p>
            </div>
          )}

          <SkeletonLoader isVisible={isLoading} />

          <CanvasPreview
            image={currentImage}
            gridN={gridN}
            gridM={gridM}
            isLoading={isLoading}
          />

          {currentImage && !isLoading && (
            <div className="workspace__actions">
              <HistoryStack
                historyCount={historyCount}
                maxDepth={maxDepth}
                canUndo={canUndo}
                isLoading={isLoading}
                onUndo={handleUndo}
              />
              <QuickEditBar
                isVisible={!!currentImage}
                isLoading={isLoading}
                onEdit={handleEdit}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
