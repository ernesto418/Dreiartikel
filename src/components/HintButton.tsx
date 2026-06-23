import { HINT_BUDGET, type Hint, type HintKind } from '../hints';

const HINT_META: Record<HintKind, { icon: string; label: string }> = {
    rule: { icon: '💡', label: 'Rule' },
    gender: { icon: '🚻', label: 'Gender' },
};

interface HintBarProps {
    /** Hint kinds the current round offers, in display order. */
    kinds: HintKind[];
    /** Remaining uses per kind. */
    remaining: Record<HintKind, number>;
    /** True while a hint is showing and the timer is frozen. */
    frozen: boolean;
    /** The currently revealed hint, if any. */
    hint: Hint | null;
    disabled: boolean;
    onUse: (kind: HintKind) => void;
}

export function HintBar({ kinds, remaining, frozen, hint, disabled, onUse }: HintBarProps) {
    return (
        <div className="hint-zone">
            <div className="hint-buttons">
                {kinds.map(kind => {
                    const left = remaining[kind];
                    const meta = HINT_META[kind];
                    const showingThis = frozen && hint?.kind === kind;
                    return (
                        <button
                            key={kind}
                            className={`hint-btn ${showingThis ? 'frozen' : ''}`}
                            onClick={() => onUse(kind)}
                            disabled={disabled || frozen || left <= 0}
                            aria-label={`${meta.label} hint (freezes the timer), ${left} left`}
                        >
                            {meta.icon} {meta.label}
                            <span className="hint-count">{left}/{HINT_BUDGET[kind]}</span>
                        </button>
                    );
                })}
            </div>

            {frozen && hint && (
                <div className="hint-callout" role="status">
                    <span className="hint-callout-icon">❄️</span>
                    <span className="hint-callout-text">{hint.text}</span>
                </div>
            )}
        </div>
    );
}
