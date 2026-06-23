import { FilterDropdown } from '../components/FilterDropdown';
import { Scoreboard } from '../components/Scoreboard';
import { WordCard } from '../components/WordCard';
import { HintBar } from '../components/HintButton';
import type { FilterType, GameMode, Round } from '../hooks/useGameState';
import type { Hint, HintKind } from '../hints';

interface GameScreenProps {
    round: Round;
    mode: GameMode;
    // scoreboard
    score: number;
    streak: number;
    bestStreak: number;
    timeBank: number;
    itemsLeft: number;
    // turn state
    isAwaitingNext: boolean;
    selectedOption: string | null;
    showTipp: boolean;
    feedback: 'correct' | 'incorrect' | null;
    tippText: string | null;
    // hints
    hintsRemaining: Record<HintKind, number>;
    availableHintKinds: HintKind[];
    isFrozen: boolean;
    revealedHint: Hint | null;
    onUseHint: (kind: HintKind) => void;
    // filter
    filter: FilterType;
    categories: string[];
    filterOpen: boolean;
    onToggleFilter: () => void;
    onSelectFilter: (filter: FilterType) => void;
    // actions
    onSelectOption: (option: string) => void;
    onReplay: () => void;
    onKnowWhy: () => void;
    onNext: (grantBonus?: boolean) => void;
    onMenu: () => void;
}

export function GameScreen(props: GameScreenProps) {
    const { round, isAwaitingNext } = props;

    return (
        <main className="game-screen">
            <div className="game-header">
                <button className="menu-btn" onClick={props.onMenu} aria-label="Back to menu">
                    ← Menu
                </button>
                <h2 className="app-title">Dreiartikel</h2>
                <span className="game-header-spacer" aria-hidden="true">← Menu</span>
            </div>

            <FilterDropdown
                filter={props.filter}
                categories={props.categories}
                open={props.filterOpen}
                onToggle={props.onToggleFilter}
                onSelect={props.onSelectFilter}
            />

            <Scoreboard
                score={props.score}
                streak={props.streak}
                bestStreak={props.bestStreak}
                timeBank={props.timeBank}
                itemsLeft={props.itemsLeft}
            />

            {/* Answer timer bar — pauses while a hint freezes the timer */}
            {!isAwaitingNext && (
                <div className="answer-timer-track">
                    <div
                        className={`answer-timer-bar ${props.isFrozen ? 'frozen' : ''}`}
                        key={round.id}
                    ></div>
                </div>
            )}

            <WordCard
                round={round}
                mode={props.mode}
                isAwaitingNext={isAwaitingNext}
                selectedOption={props.selectedOption}
                showTipp={props.showTipp}
                feedback={props.feedback}
                tippText={props.tippText}
                onSelectOption={props.onSelectOption}
                onReplay={props.onReplay}
                onKnowWhy={props.onKnowWhy}
                onNext={props.onNext}
            />

            {!isAwaitingNext && props.availableHintKinds.length > 0 && (
                <HintBar
                    kinds={props.availableHintKinds}
                    remaining={props.hintsRemaining}
                    frozen={props.isFrozen}
                    hint={props.revealedHint}
                    disabled={isAwaitingNext}
                    onUse={props.onUseHint}
                />
            )}
        </main>
    );
}
