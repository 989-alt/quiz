import { useState } from 'react';
import { validateApiKey } from '../../services/geminiService';
import './ApiKeySetup.css';

interface ApiKeySetupProps {
    onKeySet: (key: string) => void;
}

export default function ApiKeySetup({ onKeySet }: ApiKeySetupProps) {
    const [key, setKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) {
            setError('API 키를 입력해 주세요.');
            return;
        }

        setIsValidating(true);
        setError('');

        const isValid = await validateApiKey(key.trim());
        setIsValidating(false);

        if (isValid) {
            onKeySet(key.trim());
        } else {
            setError('유효하지 않은 API 키입니다. 다시 확인해 주세요.');
        }
    };

    return (
        <div className="onboarding">
            <div className="onboarding__card">
                <div className="onboarding__header">
                    <div className="onboarding__icon">🎨</div>
                    <h1 className="onboarding__title">Art Class에 오신 것을 환영합니다</h1>
                    <p className="onboarding__desc">
                        AI가 생성하는 맞춤형 미술 도안으로<br />
                        수업을 더 풍요롭게 만들어 보세요.
                    </p>
                </div>

                <form className="onboarding__form" onSubmit={handleSubmit}>
                    <div className="onboarding__field">
                        <label className="onboarding__label" htmlFor="api-key">
                            Gemini API 키
                        </label>
                        <div className="onboarding__input-wrap">
                            <input
                                id="api-key"
                                className="onboarding__input"
                                type={showKey ? 'text' : 'password'}
                                placeholder="AIza..."
                                value={key}
                                onChange={(e) => { setKey(e.target.value); setError(''); }}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className="onboarding__toggle"
                                onClick={() => setShowKey(!showKey)}
                                title={showKey ? '숨기기' : '표시'}
                            >
                                {showKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {error && <p className="onboarding__error">{error}</p>}
                    </div>

                    <button
                        className="onboarding__submit"
                        type="submit"
                        disabled={isValidating || !key.trim()}
                    >
                        {isValidating ? (
                            <>
                                <span className="spinner" /> 키 확인 중...
                            </>
                        ) : (
                            '시작하기 →'
                        )}
                    </button>
                </form>

                <div className="onboarding__help">
                    <p>
                        🔗 API 키가 없으신가요?{' '}
                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Google AI Studio에서 발급받기
                        </a>
                    </p>
                    <p className="onboarding__security">
                        🔒 입력된 키는 브라우저에만 저장되며, 서버로 전송되지 않습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
