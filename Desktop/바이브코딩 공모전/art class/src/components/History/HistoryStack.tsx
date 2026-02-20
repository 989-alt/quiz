import './HistoryStack.css';

interface HistoryStackProps {
    historyCount: number;
    maxDepth: number;
    canUndo: boolean;
    isLoading: boolean;
    onUndo: () => void;
}

export default function HistoryStack({
    historyCount,
    maxDepth,
    canUndo,
    isLoading,
    onUndo,
}: HistoryStackProps) {
    if (historyCount === 0) return null;

    return (
        <div className="history">
            <div className="history__info">
                <span className="history__dots">
                    {Array.from({ length: maxDepth }).map((_, i) => (
                        <span
                            key={i}
                            className={`history__dot ${i < historyCount ? 'history__dot--filled' : ''}`}
                        />
                    ))}
                </span>
                <span className="history__label">
                    수정 {historyCount}/{maxDepth}
                </span>
            </div>
            <button
                className="history__undo-btn"
                onClick={onUndo}
                disabled={!canUndo || isLoading}
            >
                ↩️ 이전으로 되돌리기
            </button>
        </div>
    );
}
