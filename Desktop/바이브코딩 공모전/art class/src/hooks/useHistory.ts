import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY_DEPTH = 3;

export function useHistory() {
    const [stack, setStack] = useState<string[]>([]);
    const stackRef = useRef<string[]>([]);

    const push = useCallback((image: string) => {
        const newStack = [...stackRef.current, image];
        if (newStack.length > MAX_HISTORY_DEPTH) {
            newStack.shift(); // Remove oldest
        }
        stackRef.current = newStack;
        setStack(newStack);
    }, []);

    const undo = useCallback((): string | null => {
        if (stackRef.current.length === 0) return null;
        const newStack = [...stackRef.current];
        newStack.pop(); // Remove current
        const previousImage = newStack[newStack.length - 1] || null;
        stackRef.current = newStack;
        setStack(newStack);
        return previousImage;
    }, []);

    const clear = useCallback(() => {
        stackRef.current = [];
        setStack([]);
    }, []);

    return {
        historyCount: stack.length,
        maxDepth: MAX_HISTORY_DEPTH,
        canUndo: stack.length > 1, // Need at least 2 to go back
        push,
        undo,
        clear,
    };
}
