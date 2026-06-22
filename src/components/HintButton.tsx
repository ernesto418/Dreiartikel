import type { Hint } from '../sentences';

interface HintButtonProps {
    remaining: number;
    /** Whether the current round has any hints to give. */
    available: boolean;
    /** True while a hint is showing and the timer is frozen. */
    frozen: boolean;
    /** The currently revealed hint, if any. */
    hint: Hint | null;
    disabled: boolean;
    onUse: () => void;
}

export function HintButton({ remaining, available, frozen, hint, disabled, onUse }: HintButtonProps) {
    const out = remaining <= 0;

    return (
        <div className="hint-zone">
            <button
                className={`hint-btn ${frozen ? 'frozen' : ''}`}
                onClick={onUse}
                disabled={disabled || out || !available || frozen}
                aria-label="Show a hint (freezes the timer)"
            >
                💡 Hint
                <span className="hint-count">{remaining}/3</span>
            </button>

            {frozen && hint && (
                <div className="hint-callout" role="status">
                    <span className="hint-callout-icon">❄️</span>
                    <span className="hint-callout-text">{hint.text}</span>
                </div>
            )}
        </div>
    );
}
