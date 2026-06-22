interface GameOverScreenProps {
    score: number;
    bestStreak: number;
    onPlayAgain: () => void;
}

export function GameOverScreen({ score, bestStreak, onPlayAgain }: GameOverScreenProps) {
    return (
        <div className="game-over">
            <h2>Fantastisch! 🎉</h2>
            <p>You have completed the entire dataset correctly!</p>
            <p>Final Score: {score}</p>
            <p>Best Streak: {bestStreak} 🔥</p>
            <button className="next-btn" onClick={onPlayAgain}>Play Again</button>
        </div>
    );
}
