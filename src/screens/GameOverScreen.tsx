interface GameOverScreenProps {
    score: number;
    bestStreak: number;
    /** Story mode: total questions, for an "X / N correct" tally. */
    total?: number;
    onPlayAgain: () => void;
}

export function GameOverScreen({ score, bestStreak, total, onPlayAgain }: GameOverScreenProps) {
    const isStory = total !== undefined;
    return (
        <div className="game-over">
            <h2>{isStory ? 'Geschafft! 🎉' : 'Fantastisch! 🎉'}</h2>
            <p>{isStory ? 'You reached the end of the letter!' : 'You have completed the entire dataset correctly!'}</p>
            <p>{isStory ? `You got ${score} / ${total} right` : `Final Score: ${score}`}</p>
            <p>Best Streak: {bestStreak} 🔥</p>
            <button className="next-btn" onClick={onPlayAgain}>Back to Map</button>
        </div>
    );
}
