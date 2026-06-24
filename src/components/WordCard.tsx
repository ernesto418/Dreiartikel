import { glyphForOptionSlot } from '../hooks/useInput';
import type { GameMode, Round } from '../hooks/useGameState';

/** Render the prompt, wrapping the highlighted phrase (detect mode) in a <mark>.
 *  Without a highlight the text renders as-is. Splits on the first match only;
 *  the target phrase appears once per sentence. */
function renderDisplay(text: string, highlight?: string) {
    if (!highlight) return text;
    const i = text.indexOf(highlight);
    if (i === -1) return text;
    return (
        <>
            {text.slice(0, i)}
            <mark className="case-target">{highlight}</mark>
            {text.slice(i + highlight.length)}
        </>
    );
}

interface WordCardProps {
    round: Round;
    mode: GameMode;
    isAwaitingNext: boolean;
    selectedOption: string | null;
    showTipp: boolean;
    feedback: 'correct' | 'incorrect' | null;
    tippText: string | null;
    onSelectOption: (option: string) => void;
    onReplay: () => void;
    onKnowWhy: () => void;
    onNext: (grantBonus?: boolean) => void;
}

export function WordCard({
    round,
    mode,
    isAwaitingNext,
    selectedOption,
    showTipp,
    feedback,
    tippText,
    onSelectOption,
    onReplay,
    onKnowWhy,
    onNext,
}: WordCardProps) {
    return (
        <div className="word-card">

            <div className="word-container">
                <h1 className={`active-word ${mode === 'case-single' || mode === 'case-detect' ? 'sentence' : ''}`}>
                    {renderDisplay(round.displayText, round.highlight)}
                </h1>
                <button className="replay-btn" onClick={onReplay} aria-label="Replay Audio" title="Replay Audio">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                </button>
            </div>
            {round.hint && <p className="hint-text">{round.hint}</p>}

            {/* Clickable article buttons */}
            <div className="options-grid">
                {round.options.map((option, idx) => {
                    let btnClass = "option-btn";
                    if (isAwaitingNext) {
                        if (option === round.answer) {
                            btnClass += " correct";
                        } else if (option === selectedOption) {
                            btnClass += " incorrect";
                        }
                    }

                    return (
                        <button
                            key={option}
                            onClick={() => onSelectOption(option)}
                            className={btnClass}
                            disabled={isAwaitingNext}
                        >
                            <span className="key-hint">{glyphForOptionSlot(idx, round.options.length)}</span>
                            {option}
                        </button>
                    );
                })}
            </div>

            {isAwaitingNext && (
                <div className="feedback-section" style={{ marginTop: '1rem' }}>
                    {showTipp ? (
                        <>
                            <div className="tipp-box">
                                <h3>{feedback === 'correct' ? 'Richtig! 🎉' : 'Falsch! ❌'}</h3>
                                <p>{tippText}</p>
                            </div>
                            <button className="next-btn" autoFocus onClick={() => onNext(true)}>
                                Next Word <span className="key-hint-inline">space</span>
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <h3 style={{ color: feedback === 'correct' ? 'var(--color-success)' : 'var(--color-error)', margin: 0, fontSize: '1.5rem' }}>
                                {feedback === 'correct' ? 'Richtig! 🎉' : 'Falsch! ❌'}
                            </h3>
                            <div className="feedback-buttons">
                                <button className="know-why-btn" onClick={onKnowWhy}>
                                    Know why
                                </button>
                                <button className="next-btn" autoFocus onClick={() => onNext(true)}>
                                    Next <span className="key-hint-inline">space</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
