/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert a base64 raster image to SVG using imagetracerjs.
 */
export async function imageToSvg(base64Image: string): Promise<string> {
    const ImageTracer = (await import('imagetracerjs')) as any;

    return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context를 생성할 수 없습니다.'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Options optimized for black-and-white line art
                const options = {
                    // Tracing
                    ltres: 1,        // Line threshold
                    qtres: 1,        // Quadratic spline threshold
                    pathomit: 8,     // Minimum path size (pixels)
                    // Color quantization
                    colorsampling: 0, // Disabled (use palette)
                    numberofcolors: 2, // B&W
                    // SVG rendering
                    strokewidth: 1,
                    linefilter: true,
                    scale: 1,
                    roundcoords: 1,
                    desc: false,
                    viewbox: true,
                    blurradius: 0,
                    blurdelta: 20,
                };

                const svgString = ImageTracer.default
                    ? ImageTracer.default.imagedataToSVG(imageData, options)
                    : ImageTracer.imagedataToSVG(imageData, options);

                resolve(svgString);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('이미지 로딩에 실패했습니다.'));
        img.src = `data:image/png;base64,${base64Image}`;
    });
}

/**
 * Download an SVG string as a file.
 */
export function downloadSvg(svgString: string, filename: string = 'art-class-도안.svg'): void {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
