import { useEffect } from 'react';
import type { ToastMessage } from '../../types';
import './Toast.css';

interface ToastProps {
    toast: ToastMessage | null;
    onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;

    const icons: Record<string, string> = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
    };

    return (
        <div className={`toast toast--${toast.type}`} key={toast.id}>
            <span className="toast__icon">{icons[toast.type]}</span>
            <span className="toast__msg">{toast.message}</span>
            <button className="toast__close" onClick={onClose}>×</button>
        </div>
    );
}
