import type { SwipeableHandlers } from 'react-swipeable';
import { glyphForOptionSlot } from '../hooks/useInput';
import type { GameMode, Round } from '../hooks/useGameState';

interface WordCardProps {
    round: Round;
    mode: GameMode;
    isAwaitingNext: boolean;
    selectedOption: string | null;
    showTipp: boolean;
    swipeDir: string | null;
    feedback: 'correct' | 'incorrect' | null;
    tippText: string | null;
    swipeHandlers: SwipeableHandlers;
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
    swipeDir,
    feedback,
    tippText,
    swipeHandlers,
    onSelectOption,
    onReplay,
    onKnowWhy,
    onNext,
}: WordCardProps) {
    const swipeDirClass = swipeDir ? `swipe-${swipeDir.toLowerCase()}` : '';

    return (
        <div {...swipeHandlers} className={`word-card ${swipeDirClass}`}>
            {/* Mobile swipe direction indicators — positional, match the buttons */}
            <div className="swipe-hints">
                {round.options.map((option, idx) => {
                    const glyph = glyphForOptionSlot(idx, round.options.length);
                    const pos = glyph === '←' ? 'left' : glyph === '→' ? 'right' : 'down';
                    return (
                        <span key={option} className={`swipe-hint ${pos}`}>
                            {pos === 'right' ? `${option} →` : `${glyph} ${option}`}
                        </span>
                    );
                })}
            </div>

            <div className="word-container">
                <h1 className={`active-word ${mode === 'case-single' ? 'sentence' : ''}`}>
                    {round.displayText}
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
