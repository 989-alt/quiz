import type { Difficulty } from '../../types';
import { DIFFICULTY_LABELS } from '../../types';
import './DifficultySlider.css';

interface DifficultySliderProps {
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
    disabled: boolean;
}

const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

const difficultyIcons: Record<Difficulty, string> = {
    easy: '🟢',
    medium: '🟡',
    hard: '🔴',
};

const difficultyDescs: Record<Difficulty, string> = {
    easy: '큰 도형 위주, 어린 학생용',
    medium: '적당한 디테일, 일반 수업용',
    hard: '섬세한 패턴, 고급 수업용',
};

export default function DifficultySlider({ difficulty, onDifficultyChange, disabled }: DifficultySliderProps) {
    return (
        <div className="diff-slider">
            <label className="diff-slider__label">난이도</label>
            <div className="diff-slider__options">
                {difficulties.map((d) => (
                    <button
                        key={d}
                        type="button"
                        className={`diff-slider__btn ${difficulty === d ? 'diff-slider__btn--active' : ''}`}
                        onClick={() => onDifficultyChange(d)}
                        disabled={disabled}
                    >
                        <span className="diff-slider__icon">{difficultyIcons[d]}</span>
                        <span className="diff-slider__name">{DIFFICULTY_LABELS[d]}</span>
                        <span className="diff-slider__desc">{difficultyDescs[d]}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
