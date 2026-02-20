import type { Mode, Difficulty, MandalaPreset } from '../types';
import { MANDALA_PRESET_LABELS } from '../types';
import { calculateAspectRatio } from '../utils/aspectRatio';

const DIFFICULTY_MAP: Record<Difficulty, string> = {
    easy: 'simple design with few large shapes and thick outlines, minimal detail, suitable for young children',
    medium: 'moderate detail with clear outlines, some smaller elements, suitable for older children',
    hard: 'highly detailed and intricate patterns with fine lines and complex elements, suitable for advanced students',
};

export function buildPrompt(
    mode: Mode,
    topic: string,
    mandalaPreset: MandalaPreset,
    difficulty: Difficulty,
    gridN: number,
    gridM: number
): string {
    const aspectRatio = calculateAspectRatio(gridN, gridM);
    const difficultyDesc = DIFFICULTY_MAP[difficulty];

    if (mode === 'mandala') {
        const theme = MANDALA_PRESET_LABELS[mandalaPreset];
        return [
            `Create a black and white mandala coloring page with a "${theme}" theme.`,
            `Style: ${difficultyDesc}.`,
            `The mandala should be a symmetric, circular pattern centered in the image.`,
            `Aspect ratio: ${aspectRatio}.`,
            `Requirements: pure black outlines on a pure white background, no shading, no gradients, no color fills, no gray areas.`,
            `The design must be suitable for printing and coloring with colored pencils or markers.`,
            `Clean, crisp vector-like line art quality.`,
        ].join('\n');
    }

    return [
        `Create a black and white line art coloring page of "${topic}".`,
        `Style: ${difficultyDesc}.`,
        `Aspect ratio: ${aspectRatio}.`,
        `Requirements: pure black outlines on a pure white background, no shading, no gradients, no color fills, no gray areas.`,
        `The design must be suitable for printing and coloring with colored pencils or markers.`,
        `Clean, crisp vector-like line art quality. The drawing should fill the entire canvas.`,
    ].join('\n');
}

export function buildEditPrompt(editType: string): string {
    const editMap: Record<string, string> = {
        thicker: 'Make all the outlines and lines significantly thicker and bolder. Keep everything else the same.',
        thinner: 'Make all the outlines and lines thinner and more delicate. Keep everything else the same.',
        simplify: 'Simplify the design by removing small details and merging small shapes into larger ones. Keep the overall composition.',
        addDetail: 'Add more intricate details and patterns to the existing design. Keep the overall composition.',
        addPattern: 'Add a decorative geometric pattern to the background areas. Keep the main subject the same.',
        removeBackground: 'Remove all background elements and patterns. Keep only the main subject with clean white background.',
    };

    return (
        editMap[editType] ||
        'Refine and improve this black and white line art coloring page. Keep the same subject.'
    );
}
