import { useState, useEffect, useCallback } from 'react';
import { getKey, saveKey, removeKey } from '../utils/apiKeyManager';

export function useApiKey() {
    const [apiKey, setApiKeyState] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = getKey();
        setApiKeyState(stored);
        setIsLoaded(true);
    }, []);

    const setApiKey = useCallback((key: string) => {
        saveKey(key);
        setApiKeyState(key);
    }, []);

    const clearApiKey = useCallback(() => {
        removeKey();
        setApiKeyState(null);
    }, []);

    return {
        apiKey,
        hasApiKey: !!apiKey,
        isLoaded,
        setApiKey,
        clearApiKey,
    };
}
