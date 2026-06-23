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
                        : mode === 'case-single'
                            ? 'Practice German cases — pick the right article in a sentence'
                            : 'Practice German plurals — pick the right plural form'}
                </p>

                <ModeToggle mode={mode} onChange={onModeChange} />

                <div className="rules-card">
                    <h3>📜 How to play</h3>
                    <ul>
                        {mode === 'article' ? (
                            <li>A German word appears — pick the correct article.</li>
                        ) : mode === 'case-single' ? (
                            <li>A sentence appears with a blank — pick the article the noun needs in that case.</li>
                        ) : (
                            <li>A noun appears in the singular — pick its correct plural form.</li>
                        )}
                        <li>You have <strong>3 seconds</strong> to answer or it counts as wrong.</li>
                        <li>Answer fast and press <strong>Next</strong> early to recover time!</li>
                        <li>Wrong answers come back later until you get them right.</li>
                        <li>Build a <strong>streak</strong> to trigger confetti! 🎉</li>
                    </ul>

                    {mode === 'article' ? (
                        <>
                            <h3>📱 How to answer</h3>
                            <ul>
                                <li><strong>Tap</strong> the article you think is right.</li>
                                <li className="desktop-only">Or use the <strong>← ↓ →</strong> arrow keys, <strong>Space</strong> for next.</li>
                            </ul>
                        </>
                    ) : mode === 'case-single' ? (
                        <>
                            <h3>🎯 Cases</h3>
                            <ul>
                                <li>The article changes with the case: <strong>den</strong> Hund (Akk), <strong>dem</strong> Hund (Dat)…</li>
                                <li><strong>Tap</strong> the right article — buttons are <strong>shuffled</strong>, so read first!</li>
                            </ul>
                        </>
                    ) : (
                        <>
                            <h3>🔢 Plural</h3>
                            <ul>
                                <li>German has 8 plural patterns: <strong>das Buch → die Bücher</strong>, <strong>der Tag → die Tage</strong>…</li>
                                <li><strong>Tap</strong> the right plural — the look-alikes follow the <em>other</em> patterns.</li>
                                <li>Stuck? The <strong>hint</strong> tells you which pattern applies.</li>
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
