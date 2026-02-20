import type { MandalaPreset } from '../../types';
import { MANDALA_PRESET_LABELS } from '../../types';
import './MandalaPresets.css';

interface MandalaPresetsProps {
    selected: MandalaPreset;
    onSelect: (preset: MandalaPreset) => void;
    disabled: boolean;
}

const presets = Object.keys(MANDALA_PRESET_LABELS) as MandalaPreset[];

const presetIcons: Record<MandalaPreset, string> = {
    cosmos: '🌌',
    nature: '🌿',
    flower: '🌸',
    snow: '❄️',
    ocean: '🌊',
    butterfly: '🦋',
    star: '⭐',
    leaf: '🍃',
};

export default function MandalaPresets({ selected, onSelect, disabled }: MandalaPresetsProps) {
    return (
        <div className="mandala-presets">
            <label className="mandala-presets__label">만다라 테마</label>
            <div className="mandala-presets__grid">
                {presets.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        className={`mandala-presets__chip ${selected === preset ? 'mandala-presets__chip--active' : ''}`}
                        onClick={() => onSelect(preset)}
                        disabled={disabled}
                    >
                        <span className="mandala-presets__icon">{presetIcons[preset]}</span>
                        <span>{MANDALA_PRESET_LABELS[preset]}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
