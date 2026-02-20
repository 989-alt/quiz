import './QuickEditBar.css';

interface QuickEditBarProps {
    isVisible: boolean;
    isLoading: boolean;
    onEdit: (editType: string) => void;
}

const editButtons = [
    { type: 'thicker', label: '선 굵게', icon: '🖊️' },
    { type: 'thinner', label: '선 가늘게', icon: '✒️' },
    { type: 'simplify', label: '단순화', icon: '🔲' },
    { type: 'addDetail', label: '디테일 추가', icon: '🔍' },
    { type: 'addPattern', label: '배경 패턴', icon: '🎭' },
    { type: 'removeBackground', label: '배경 제거', icon: '🧹' },
];

export default function QuickEditBar({ isVisible, isLoading, onEdit }: QuickEditBarProps) {
    if (!isVisible) return null;

    return (
        <div className="quick-edit">
            <div className="quick-edit__warning">
                ⚠️ 빠른 수정 기능은 추가 API 크레딧을 소모합니다.
            </div>
            <div className="quick-edit__chips">
                {editButtons.map((btn) => (
                    <button
                        key={btn.type}
                        className="quick-edit__chip"
                        onClick={() => onEdit(btn.type)}
                        disabled={isLoading}
                    >
                        <span>{btn.icon}</span>
                        <span>{btn.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
