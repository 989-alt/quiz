const STORAGE_KEY = 'gemini_api_key';

export function saveKey(key: string): void {
    localStorage.setItem(STORAGE_KEY, key);
}

export function getKey(): string | null {
    return localStorage.getItem(STORAGE_KEY);
}

export function removeKey(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function maskKey(key: string): string {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
}
