import { maskKey } from '../../utils/apiKeyManager';
import './Header.css';

interface HeaderProps {
    apiKey: string | null;
    onSettingsClick: () => void;
}

export default function Header({ apiKey, onSettingsClick }: HeaderProps) {
    return (
        <header className="header">
            <div className="header__brand">
                <div className="header__logo">🎨</div>
                <div className="header__text">
                    <h1 className="header__title">Art Class</h1>
                    <span className="header__subtitle">AI 미술 도안 워크스페이스</span>
                </div>
            </div>
            <div className="header__actions">
                <div className="header__key-status">
                    {apiKey ? (
                        <span className="header__key-badge header__key-badge--active">
                            🔑 {maskKey(apiKey)}
                        </span>
                    ) : (
                        <span className="header__key-badge header__key-badge--inactive">
                            키 미설정
                        </span>
                    )}
                </div>
                <button className="header__settings-btn" onClick={onSettingsClick} title="API 키 설정">
                    ⚙️
                </button>
            </div>
        </header>
    );
}
