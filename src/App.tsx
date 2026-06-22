import { useState, useRef, useEffect } from 'react';
import { useGameState, type FilterType, type GameMode } from './hooks/useGameState';
import { useInput } from './hooks/useInput';
import { getCategories } from './data';
import { getHypeLevel, fireConfetti } from './utils/confetti';
import { StartScreen } from './screens/StartScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';

const thematicCategories = getCategories();

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
    replay: onReplay,
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

  // Positional input (swipe + keyboard)
  const { swipeHandlers } = useInput({
    active: started,
    currentWord,
    isAwaitingNext,
    onSelectOption: selectAnswer,
    onNext,
  });

  // ─── Routing ───────────────────────────────────────────────────────
  if (!started) {
    return (
      <StartScreen
        mode={mode}
        onModeChange={setMode}
        onStart={() => setStarted(true)}
      />
    );
  }

  if (!currentWord) {
    return (
      <GameOverScreen
        score={score}
        bestStreak={bestStreak}
        onPlayAgain={() => window.location.reload()}
      />
    );
  }

  return (
    <GameScreen
      round={currentWord}
      mode={mode}
      score={score}
      streak={streak}
      bestStreak={bestStreak}
      timeBank={timeBank}
      itemsLeft={itemsLeft}
      isAwaitingNext={isAwaitingNext}
      selectedOption={selectedOption}
      showTipp={showTipp}
      swipeDir={swipeDir}
      feedback={feedback}
      tippText={tippText}
      filter={filter}
      categories={thematicCategories}
      filterOpen={filterOpen}
      onToggleFilter={() => setFilterOpen(o => !o)}
      onSelectFilter={(f) => { setFilter(f); setFilterOpen(false); }}
      swipeHandlers={swipeHandlers}
      onSelectOption={(option) => selectAnswer(option)}
      onReplay={onReplay}
      onKnowWhy={knowWhy}
      onNext={onNext}
      onMenu={() => setStarted(false)}
    />
  );
}

export default App;
