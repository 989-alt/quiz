import { jsPDF } from 'jspdf';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

/**
 * Export the generated image as a multi-page PDF,
 * split into N x M grid pieces, each on a separate A4 page at (0,0) with no margins.
 */
export async function exportToPdf(
    base64Image: string,
    gridN: number,
    gridM: number,
    filename: string = 'art-class-도안.pdf'
): Promise<void> {
    // Load image into canvas
    const img = await loadImage(`data:image/png;base64,${base64Image}`);
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = img.width;
    sourceCanvas.height = img.height;
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.drawImage(img, 0, 0);

    // Each piece dimensions in pixels
    const pieceW = Math.floor(img.width / gridN);
    const pieceH = Math.floor(img.height / gridM);

    const doc = new jsPDF({
        orientation: pieceW > pieceH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    let isFirstPage = true;

    for (let row = 0; row < gridM; row++) {
        for (let col = 0; col < gridN; col++) {
            if (!isFirstPage) {
                doc.addPage('a4', pieceW > pieceH ? 'landscape' : 'portrait');
            }
            isFirstPage = false;

            // Extract piece from source canvas
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = pieceW;
            pieceCanvas.height = pieceH;
            const pieceCtx = pieceCanvas.getContext('2d')!;
            pieceCtx.drawImage(
                sourceCanvas,
                col * pieceW,
                row * pieceH,
                pieceW,
                pieceH,
                0,
                0,
                pieceW,
                pieceH
            );

            const pieceDataUrl = pieceCanvas.toDataURL('image/png');

            // Determine orientation-aware dimensions
            const pageW = pieceW > pieceH ? A4_HEIGHT : A4_WIDTH;
            const pageH = pieceW > pieceH ? A4_WIDTH : A4_HEIGHT;

            // Add image at (0, 0) filling entire page — no margins
            doc.addImage(pieceDataUrl, 'PNG', 0, 0, pageW, pageH);
        }
    }

    doc.save(filename);
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
        img.src = src;
    });
}
