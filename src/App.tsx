import { useState, useRef, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useGameState, type FilterType, type GameMode } from './hooks/useGameState';
import { getCategories } from './data';
import { getHypeLevel, fireConfetti, getStreakColor } from './utils/confetti';

const thematicCategories = getCategories();

// Swipe/key directions map to option *positions*, not fixed articles, so the
// same handlers work whether a round has 3 options (der/die/das, den/die/das)
// or 2 (Dativ: dem/der). Order: Left → Down → Right.
const SWIPE_ORDER = ['Left', 'Down', 'Right'];
const KEY_ORDER = ['ArrowLeft', 'ArrowDown', 'ArrowRight'];

/** The direction glyph shown on the option at `idx`. With 3 options it's
 *  ←/↓/→; with 2 (Dativ) the middle is skipped so they read ← and →. */
function glyphForOptionSlot(idx: number, count: number): string {
  if (count === 2) return idx === 0 ? '←' : '→';
  return ['←', '↓', '→'][idx] ?? '';
}

function App() {
  const [started, setStarted] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('article');

  const {
    currentWord,
    score,
    streak,
    bestStreak,
    feedback,
    tippText,
    isAwaitingNext,
    selectedOption,
    showTipp,
    swipeDir,
    selectAnswer,
    knowWhy,
    next: onNext,
    replay: handleReplay,
    itemsLeft,
    timeBank,
  } = useGameState(filter, mode, started);

  const prevStreakRef = useRef(0);

  // Reset confetti baseline when filter or mode changes
  useEffect(() => {
    prevStreakRef.current = 0;
  }, [filter, mode]);

  // Fire confetti only when matching or doubling the previous best
  useEffect(() => {
    if (streak > prevStreakRef.current && streak > 0 && bestStreak > 0) {
      const isMatchOrMultiple = streak === bestStreak || (streak > bestStreak && streak % bestStreak === 0);
      if (isMatchOrMultiple) {
        const hype = getHypeLevel(streak, bestStreak);
        fireConfetti(hype);
      }
    }
    prevStreakRef.current = streak;
  }, [streak, bestStreak]);

  const onSelectOption = selectAnswer;
  const onKnowWhy = knowWhy;

  // ─── Positional input (swipe + keyboard) ──────────────────────────
  // Map a direction (by its slot in Left/Down/Right) to the option in that
  // position. With 3 options the mapping is direct; with 2 (Dativ), the middle
  // direction is dropped so Left/Right hit options[0]/[1].
  const optionForDirSlot = useCallback((slot: number): string | undefined => {
    if (!currentWord) return undefined;
    const opts = currentWord.options;
    if (opts.length >= 3) return opts[slot];
    if (opts.length === 2) {
      if (slot === 0) return opts[0];
      if (slot === 2) return opts[1];
      return undefined; // Down inert with two options
    }
    return opts[0];
  }, [currentWord]);

  const swipeHandlers = useSwipeable({
    onSwiped: (e) => {
      const slot = SWIPE_ORDER.indexOf(e.dir);
      const option = slot >= 0 ? optionForDirSlot(slot) : undefined;
      if (option && !isAwaitingNext && currentWord) {
        onSelectOption(option, e.dir);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 40,
  });

  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const slot = KEY_ORDER.indexOf(e.key);
      if (slot >= 0 && !isAwaitingNext && currentWord) {
        const option = optionForDirSlot(slot);
        if (option) {
          e.preventDefault();
          onSelectOption(option);
          return;
        }
      }
      if (e.key === ' ' && isAwaitingNext) {
        e.preventDefault();
        onNext(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, isAwaitingNext, currentWord, onSelectOption, onNext, optionForDirSlot]);

  // ─── Filter label helper ──────────────────────────────────────────
  const filterLabel = filter === 'all' ? 'All Words'
    : filter === 'by-rule' ? 'By Rule'
    : filter === 'without-rule' ? 'Without Rule'
    : filter;

  // ─── Welcome / Start Screen ───────────────────────────────────────
  if (!started) {
    return (
      <main>
        <div className="start-screen">
          <h1 className="start-title">Dreiartikel</h1>
          <p className="start-subtitle">
            {mode === 'article'
              ? 'Master German articles — der, die, das'
              : 'Practice German cases — pick the right article in a sentence'}
          </p>

          <div className="mode-toggle" role="group" aria-label="Practice mode">
            <button
              className={`mode-btn ${mode === 'article' ? 'active' : ''}`}
              onClick={() => setMode('article')}
            >
              Articles
            </button>
            <button
              className={`mode-btn ${mode === 'case-single' ? 'active' : ''}`}
              onClick={() => setMode('case-single')}
            >
              Cases
            </button>
          </div>

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

          <button className="start-btn" onClick={() => setStarted(true)}>
            Los geht's!
          </button>
        </div>
      </main>
    );
  }

  // ─── Game Over Screen ─────────────────────────────────────────────
  if (!currentWord) {
    return (
      <div className="game-over">
        <h2>Fantastisch! 🎉</h2>
        <p>You have completed the entire dataset correctly!</p>
        <p>Final Score: {score}</p>
        <p>Best Streak: {bestStreak} 🔥</p>
        <button className="next-btn" onClick={() => window.location.reload()}>Play Again</button>
      </div>
    );
  }

  const streakColor = getStreakColor(streak, bestStreak);
  const timeBankSeconds = (timeBank / 1000).toFixed(1);

  // Swipe direction labels to show on card during swipe
  const swipeDirClass = swipeDir ? `swipe-${swipeDir.toLowerCase()}` : '';

  // ─── Main Game UI ─────────────────────────────────────────────────
  return (
    <main>
      <div className="game-header">
        <button className="menu-btn" onClick={() => setStarted(false)} aria-label="Back to menu">
          ← Menu
        </button>
        <h2 className="app-title">Dreiartikel</h2>
        <span className="game-header-spacer" aria-hidden="true">← Menu</span>
      </div>

      {/* ─── Collapsible Filter Dropdown ─── */}
      <div className="filter-dropdown">
        <button
          className="filter-toggle"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          🏷️ {filterLabel}
          <span className={`filter-arrow ${filterOpen ? 'open' : ''}`}>▾</span>
        </button>

        {filterOpen && (
          <div className="filter-menu">
            {[
              { key: 'all', label: 'All Words' },
              { key: 'by-rule', label: '📏 By Rule' },
              { key: 'without-rule', label: '🎲 Without Rule' },
              ...thematicCategories.map(cat => ({ key: cat, label: cat })),
            ].map(item => (
              <button
                key={item.key}
                className={`filter-menu-item ${filter === item.key ? 'active' : ''}`}
                onClick={() => {
                  setFilter(item.key as FilterType);
                  setFilterOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="scoreboard">
        <span className="score-correct">Score: {score}</span>
        <span className="streak" style={{ color: streakColor, transition: 'color 0.3s' }}>
          🔥 {streak} {bestStreak > 0 && <span className="best-streak">(best: {bestStreak})</span>}
        </span>
        <span className="time-bank">⏱ {timeBankSeconds}s</span>
        <span className="items-left">Left: {itemsLeft}</span>
      </div>

      {/* Answer timer bar */}
      {!isAwaitingNext && (
        <div className="answer-timer-track">
          <div className="answer-timer-bar" key={currentWord.id}></div>
        </div>
      )}

      {/* ─── Swipeable Word Card ─── */}
      <div {...swipeHandlers} className={`word-card ${swipeDirClass}`}>
        {/* Mobile swipe direction indicators — positional, match the buttons */}
        <div className="swipe-hints">
          {currentWord.options.map((option, idx) => {
            const glyph = glyphForOptionSlot(idx, currentWord.options.length);
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
            {currentWord.displayText}
          </h1>
          <button className="replay-btn" onClick={handleReplay} aria-label="Replay Audio" title="Replay Audio">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </button>
        </div>
        {currentWord.hint && <p className="hint-text">{currentWord.hint}</p>}

        {/* Clickable article buttons */}
        <div className="options-grid">
          {currentWord.options.map((option, idx) => {
            let btnClass = "option-btn";
            if (isAwaitingNext) {
              if (option === currentWord.answer) {
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
                <span className="key-hint">{glyphForOptionSlot(idx, currentWord.options.length)}</span>
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
    </main>
  );
}

export default App;
