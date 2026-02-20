declare module 'imagetracerjs' {
    interface ImageTracerOptions {
        ltres?: number;
        qtres?: number;
        pathomit?: number;
        colorsampling?: number;
        numberofcolors?: number;
        strokewidth?: number;
        linefilter?: boolean;
        scale?: number;
        roundcoords?: number;
        desc?: boolean;
        viewbox?: boolean;
        blurradius?: number;
        blurdelta?: number;
    }

    function imagedataToSVG(imagedata: ImageData, options?: ImageTracerOptions): string;

    export default {
        imagedataToSVG,
    };
}
