import { GoogleGenAI } from '@google/genai';

/**
 * Generate a line art image using Gemini's image generation.
 * Returns the base64-encoded image data.
 */
export async function generateImage(
    apiKey: string,
    prompt: string
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-image-generation',
        contents: prompt,
        config: {
            responseModalities: ['Text', 'Image'],
        },
    });

    if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI가 응답을 생성하지 못했습니다.');
    }

    const candidate = response.candidates[0];

    // Check for safety filter
    if (candidate.finishReason === 'SAFETY') {
        throw new SafetyFilterError('⚠️ 안전 정책에 의해 이미지 생성이 차단되었습니다. 다른 주제로 시도해 주세요.');
    }

    // Extract inline image data
    const parts = candidate.content?.parts;
    if (!parts) {
        throw new Error('응답에 이미지 데이터가 없습니다.');
    }

    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
    }

    throw new Error('이미지를 생성하지 못했습니다. 다시 시도해 주세요.');
}

/**
 * Edit an existing image using Gemini's image+text-to-image capability.
 * Returns the base64-encoded edited image data.
 */
export async function editImage(
    apiKey: string,
    imageBase64: string,
    editPrompt: string
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-image-generation',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageBase64,
                        },
                    },
                    {
                        text: `${editPrompt}\n\nIMPORTANT: The result must remain a black and white line art coloring page with pure black outlines on white background. No shading, no gradients, no colors.`,
                    },
                ],
            },
        ],
        config: {
            responseModalities: ['Text', 'Image'],
        },
    });

    if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI가 수정 응답을 생성하지 못했습니다.');
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
        throw new SafetyFilterError('⚠️ 안전 정책에 의해 이미지 수정이 차단되었습니다.');
    }

    const parts = candidate.content?.parts;
    if (!parts) {
        throw new Error('수정 응답에 이미지 데이터가 없습니다.');
    }

    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
    }

    throw new Error('이미지를 수정하지 못했습니다. 다시 시도해 주세요.');
}

/**
 * Validate an API key by making a lightweight request.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-image-generation',
            contents: 'Hi',
            config: { responseModalities: ['Text'] },
        });
        return true;
    } catch {
        return false;
    }
}

export class SafetyFilterError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SafetyFilterError';
    }
}
