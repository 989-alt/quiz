import { useState, useEffect } from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
    isVisible: boolean;
}

const messages = [
    { text: 'AI가 밑그림을 스케치하는 중...', icon: '✏️' },
    { text: '윤곽선을 다듬는 중...', icon: '🖊️' },
    { text: '펜 터치를 마무리하는 중...', icon: '🎨' },
    { text: '거의 완성되었어요!', icon: '✨' },
];

export default function SkeletonLoader({ isVisible }: SkeletonLoaderProps) {
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) {
            setMsgIndex(0);
            return;
        }
        const timer = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % messages.length);
        }, 2500);
        return () => clearInterval(timer);
    }, [isVisible]);

    if (!isVisible) return null;

    const current = messages[msgIndex];

    return (
        <div className="skeleton">
            <div className="skeleton__box">
                <div className="skeleton__pulse" />
                <div className="skeleton__content">
                    <div className="skeleton__icon">{current.icon}</div>
                    <p className="skeleton__text" key={msgIndex}>{current.text}</p>
                </div>
            </div>
        </div>
    );
}
