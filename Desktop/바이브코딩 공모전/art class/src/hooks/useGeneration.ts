import { useState, useCallback } from 'react';
import { generateImage, editImage, SafetyFilterError } from '../services/geminiService';
import { buildPrompt, buildEditPrompt } from '../services/promptBuilder';
import type { GenerationConfig, ToastMessage } from '../types';

interface UseGenerationReturn {
    currentImage: string | null;
    isLoading: boolean;
    generate: (apiKey: string, config: GenerationConfig) => Promise<void>;
    edit: (apiKey: string, editType: string) => Promise<void>;
    setCurrentImage: (image: string | null) => void;
    toast: ToastMessage | null;
    clearToast: () => void;
}

let toastCounter = 0;

export function useGeneration(): UseGenerationReturn {
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const showToast = useCallback((type: ToastMessage['type'], message: string) => {
        setToast({ id: `toast-${++toastCounter}`, type, message });
    }, []);

    const clearToast = useCallback(() => setToast(null), []);

    const generate = useCallback(
        async (apiKey: string, config: GenerationConfig) => {
            setIsLoading(true);
            clearToast();
            try {
                const prompt = buildPrompt(
                    config.mode,
                    config.topic,
                    config.mandalaPreset,
                    config.difficulty,
                    config.gridN,
                    config.gridM
                );
                const imageData = await generateImage(apiKey, prompt);
                setCurrentImage(imageData);
                showToast('success', '✨ 도안이 성공적으로 생성되었습니다!');
            } catch (err) {
                if (err instanceof SafetyFilterError) {
                    showToast('warning', err.message);
                } else {
                    showToast('error', err instanceof Error ? err.message : '이미지 생성 중 오류가 발생했습니다.');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [clearToast, showToast]
    );

    const edit = useCallback(
        async (apiKey: string, editType: string) => {
            if (!currentImage) return;
            setIsLoading(true);
            clearToast();
            try {
                const editPrompt = buildEditPrompt(editType);
                const editedData = await editImage(apiKey, currentImage, editPrompt);
                setCurrentImage(editedData);
                showToast('success', '✏️ 도안이 수정되었습니다!');
            } catch (err) {
                if (err instanceof SafetyFilterError) {
                    showToast('warning', err.message);
                } else {
                    showToast('error', err instanceof Error ? err.message : '이미지 수정 중 오류가 발생했습니다.');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [currentImage, clearToast, showToast]
    );

    return {
        currentImage,
        isLoading,
        generate,
        edit,
        setCurrentImage,
        toast,
        clearToast,
    };
}
