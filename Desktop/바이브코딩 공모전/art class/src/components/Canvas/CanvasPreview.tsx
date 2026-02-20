import './CanvasPreview.css';

interface CanvasPreviewProps {
    image: string | null;
    gridN: number;
    gridM: number;
    isLoading: boolean;
}

export default function CanvasPreview({ image, gridN, gridM, isLoading }: CanvasPreviewProps) {
    if (isLoading || !image) return null;

    return (
        <div className="canvas-preview">
            <div className="canvas-preview__container">
                <img
                    className="canvas-preview__image"
                    src={`data:image/png;base64,${image}`}
                    alt="생성된 도안"
                />
                {/* Grid overlay */}
                {(gridN > 1 || gridM > 1) && (
                    <div className="canvas-preview__overlay">
                        {/* Vertical lines */}
                        {Array.from({ length: gridN - 1 }).map((_, i) => (
                            <div
                                key={`v-${i}`}
                                className="canvas-preview__guide canvas-preview__guide--v"
                                style={{ left: `${((i + 1) / gridN) * 100}%` }}
                            />
                        ))}
                        {/* Horizontal lines */}
                        {Array.from({ length: gridM - 1 }).map((_, i) => (
                            <div
                                key={`h-${i}`}
                                className="canvas-preview__guide canvas-preview__guide--h"
                                style={{ top: `${((i + 1) / gridM) * 100}%` }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
