import { useState } from 'react';
import { imageToSvg, downloadSvg } from '../../utils/vectorizer';
import { exportToPdf } from '../../utils/pdfExporter';
import './ExportPanel.css';

interface ExportPanelProps {
    image: string | null;
    gridN: number;
    gridM: number;
}

export default function ExportPanel({ image, gridN, gridM }: ExportPanelProps) {
    const [isExporting, setIsExporting] = useState<'svg' | 'pdf' | null>(null);

    if (!image) return null;

    const handleSvgDownload = async () => {
        setIsExporting('svg');
        try {
            const svgString = await imageToSvg(image);
            downloadSvg(svgString);
        } catch (err) {
            console.error('SVG 변환 실패:', err);
            alert('SVG 변환 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(null);
        }
    };

    const handlePdfDownload = async () => {
        setIsExporting('pdf');
        try {
            await exportToPdf(image, gridN, gridM);
        } catch (err) {
            console.error('PDF 생성 실패:', err);
            alert('PDF 생성 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(null);
        }
    };

    const handlePngDownload = () => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${image}`;
        link.download = 'art-class-도안.png';
        link.click();
    };

    return (
        <div className="export-panel">
            <h3 className="export-panel__title">내보내기</h3>
            <div className="export-panel__buttons">
                <button
                    className="export-panel__btn export-panel__btn--png"
                    onClick={handlePngDownload}
                    disabled={!!isExporting}
                >
                    🖼️ PNG 원본
                </button>
                <button
                    className="export-panel__btn export-panel__btn--svg"
                    onClick={handleSvgDownload}
                    disabled={!!isExporting}
                >
                    {isExporting === 'svg' ? (
                        <><span className="spinner spinner--sm" /> 변환 중...</>
                    ) : (
                        '📐 SVG 벡터'
                    )}
                </button>
                <button
                    className="export-panel__btn export-panel__btn--pdf"
                    onClick={handlePdfDownload}
                    disabled={!!isExporting}
                >
                    {isExporting === 'pdf' ? (
                        <><span className="spinner spinner--sm" /> 생성 중...</>
                    ) : (
                        `📄 PDF ${gridN}×${gridM} 분할`
                    )}
                </button>
            </div>
        </div>
    );
}
