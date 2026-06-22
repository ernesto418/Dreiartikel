import { getStreakColor } from '../utils/confetti';

interface ScoreboardProps {
    score: number;
    streak: number;
    bestStreak: number;
    timeBank: number;
    itemsLeft: number;
}

export function Scoreboard({ score, streak, bestStreak, timeBank, itemsLeft }: ScoreboardProps) {
    const streakColor = getStreakColor(streak, bestStreak);
    const timeBankSeconds = (timeBank / 1000).toFixed(1);

    return (
        <div className="scoreboard">
            <span className="score-correct">Score: {score}</span>
            <span className="streak" style={{ color: streakColor, transition: 'color 0.3s' }}>
                🔥 {streak} {bestStreak > 0 && <span className="best-streak">(best: {bestStreak})</span>}
            </span>
            <span className="time-bank">⏱ {timeBankSeconds}s</span>
            <span className="items-left">Left: {itemsLeft}</span>
        </div>
    );
}
