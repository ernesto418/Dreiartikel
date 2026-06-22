import { ModeToggle } from '../components/ModeToggle';
import type { GameMode } from '../hooks/useGameState';

interface StartScreenProps {
    mode: GameMode;
    onModeChange: (mode: GameMode) => void;
    onStart: () => void;
}

export function StartScreen({ mode, onModeChange, onStart }: StartScreenProps) {
    return (
        <main>
            <div className="start-screen">
                <h1 className="start-title">Dreiartikel</h1>
                <p className="start-subtitle">
                    {mode === 'article'
                        ? 'Master German articles — der, die, das'
                        : 'Practice German cases — pick the right article in a sentence'}
                </p>

                <ModeToggle mode={mode} onChange={onModeChange} />

                <div className="rules-card">
                    <h3>📜 How to play</h3>
                    <ul>
                        {mode === 'article' ? (
                            <li>A German word appears — pick the correct article.</li>
                        ) : (
                            <li>A sentence appears with a blank — pick the article the noun needs in that case.</li>
                        )}
                        <li>You have <strong>3 seconds</strong> to answer or it counts as wrong.</li>
                        <li>Answer fast and press <strong>Next</strong> early to recover time!</li>
                        <li>Wrong answers come back later until you get them right.</li>
                        <li>Build a <strong>streak</strong> to trigger confetti! 🎉</li>
                    </ul>

                    {mode === 'article' ? (
                        <>
                            <h3>📱 On mobile</h3>
                            <ul>
                                <li><strong>Swipe ← left</strong> = der</li>
                                <li><strong>Swipe ↓ down</strong> = die</li>
                                <li><strong>Swipe → right</strong> = das</li>
                            </ul>

                            <h3 className="desktop-only">⌨️ On desktop</h3>
                            <ul className="desktop-only">
                                <li><strong>← Left Arrow</strong> = der</li>
                                <li><strong>↓ Down Arrow</strong> = die</li>
                                <li><strong>→ Right Arrow</strong> = das</li>
                                <li><strong>Space</strong> = Next word</li>
                            </ul>
                        </>
                    ) : (
                        <>
                            <h3>🎯 Cases</h3>
                            <ul>
                                <li>The article changes with the case: <strong>den</strong> Hund (Akk), <strong>dem</strong> Hund (Dat)…</li>
                                <li>Swipe or use arrow keys — options match the on-screen buttons (left → right).</li>
                                <li>Buttons are <strong>shuffled</strong>, so read before you answer!</li>
                            </ul>
                        </>
                    )}

                    <h3>🏷️ Filters</h3>
                    <ul>
                        <li><strong>By Rule</strong> — words that follow a suffix/prefix pattern.</li>
                        <li><strong>Without Rule</strong> — words you just have to memorize.</li>
                        <li>Or pick a topic: Food, Family, Body, Animals, etc.</li>
                    </ul>
                </div>

                <button className="start-btn" onClick={onStart}>
                    Los geht's!
                </button>
            </div>
        </main>
    );
}
