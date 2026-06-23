import type { GameMode } from '../hooks/useGameState';

interface ModeToggleProps {
    mode: GameMode;
    onChange: (mode: GameMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
    return (
        <div className="mode-toggle" role="group" aria-label="Practice mode">
            <button
                className={`mode-btn ${mode === 'article' ? 'active' : ''}`}
                onClick={() => onChange('article')}
            >
                Articles
            </button>
            <button
                className={`mode-btn ${mode === 'case-single' ? 'active' : ''}`}
                onClick={() => onChange('case-single')}
            >
                Cases
            </button>
            <button
                className={`mode-btn ${mode === 'plural' ? 'active' : ''}`}
                onClick={() => onChange('plural')}
            >
                Plural
            </button>
        </div>
    );
}
