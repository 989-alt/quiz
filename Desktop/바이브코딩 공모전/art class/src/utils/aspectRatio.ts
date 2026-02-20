// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

/**
 * Calculate the aspect ratio string for the full image
 * based on the NxM grid and A4 paper dimensions.
 * The full image should have a ratio of (N * pieceW) : (M * pieceH)
 * which simplifies to N * A4_WIDTH : M * A4_HEIGHT
 */
export function calculateAspectRatio(n: number, m: number): string {
    const w = n * A4_WIDTH;
    const h = m * A4_HEIGHT;
    const g = gcd(w, h);
    return `${w / g}:${h / g}`;
}

export function calculateImageDimensions(n: number, m: number): { width: number; height: number } {
    // Target ~1024px on the largest side
    const ratio = (n * A4_WIDTH) / (m * A4_HEIGHT);
    if (ratio >= 1) {
        return { width: 1024, height: Math.round(1024 / ratio) };
    }
    return { width: Math.round(1024 * ratio), height: 1024 };
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}
