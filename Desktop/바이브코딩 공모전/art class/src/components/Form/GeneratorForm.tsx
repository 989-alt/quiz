import { useState } from 'react';
import type { GenerationConfig, Mode, Difficulty, MandalaPreset } from '../../types';
import ModeSelector from './ModeSelector';
import DifficultySlider from './DifficultySlider';
import GridSelector from './GridSelector';
import MandalaPresets from './MandalaPresets';
import './GeneratorForm.css';

interface GeneratorFormProps {
    isLoading: boolean;
    onGenerate: (config: GenerationConfig) => void;
}

export default function GeneratorForm({ isLoading, onGenerate }: GeneratorFormProps) {
    const [mode, setMode] = useState<Mode>('free');
    const [topic, setTopic] = useState('');
    const [mandalaPreset, setMandalaPreset] = useState<MandalaPreset>('flower');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [gridN, setGridN] = useState(2);
    const [gridM, setGridM] = useState(2);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'free' && !topic.trim()) return;
        onGenerate({ mode, topic, mandalaPreset, difficulty, gridN, gridM });
    };

    const canSubmit = mode === 'mandala' || topic.trim().length > 0;

    return (
        <form className="gen-form" onSubmit={handleSubmit}>
            <h2 className="gen-form__title">도안 설정</h2>

            <ModeSelector mode={mode} onModeChange={setMode} disabled={isLoading} />

            {mode === 'free' ? (
                <div className="gen-form__field">
                    <label className="gen-form__label">주제 입력</label>
                    <input
                        className="gen-form__input"
                        type="text"
                        placeholder="예: 사과 바구니, 봄 풍경, 우주선..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isLoading}
                        maxLength={100}
                    />
                </div>
            ) : (
                <MandalaPresets
                    selected={mandalaPreset}
                    onSelect={setMandalaPreset}
                    disabled={isLoading}
                />
            )}

            <DifficultySlider
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                disabled={isLoading}
            />

            <GridSelector
                gridN={gridN}
                gridM={gridM}
                onGridNChange={setGridN}
                onGridMChange={setGridM}
                disabled={isLoading}
            />

            <button
                className="gen-form__submit"
                type="submit"
                disabled={isLoading || !canSubmit}
            >
                {isLoading ? (
                    <>
                        <span className="spinner" /> 생성 중...
                    </>
                ) : (
                    '🎨 도안 생성'
                )}
            </button>
        </form>
    );
}
