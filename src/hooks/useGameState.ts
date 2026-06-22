import { useState, useEffect, useCallback, useRef } from 'react';
import { generateItems, shuffle, type PracticeItem } from '../data';
import { hasRule, getTipp } from '../rules';
import { generateRounds } from '../sentences';
import { playWord } from '../utils/speech';

export type FilterType = 'all' | 'by-rule' | 'without-rule' | string;
export type GameMode = 'article' | 'case-single';

/** The presentable unit the game loop consumes, identical across modes. */
export interface Round {
    id: string;
    /** What the learner sees: a bare word, or a sentence with a `___` blank. */
    displayText: string;
    /** Secondary line under the word (translation hint), if any. */
    hint?: string;
    answer: string;
    options: string[];
    /** Explanation shown after answering. */
    tipp: string;
    /** What the speech engine reads aloud. */
    speakText: string;
}

const INITIAL_TIME_BANK = 3000; // 3 seconds starting budget
const TIME_PER_WORD = 3000;     // 3 seconds allowed per word
const BONUS_CAP = 2000;         // max bonus you can recover per word

function buildQueue(filter: FilterType, mode: GameMode): Round[] {
    let items = generateItems();

    if (filter === 'by-rule') {
        items = items.filter(i => hasRule(i.word, i.gender));
    } else if (filter === 'without-rule') {
        items = items.filter(i => !hasRule(i.word, i.gender));
    } else if (filter !== 'all') {
        items = items.filter(i => i.category === filter);
    }

    if (mode === 'case-single') {
        return generateRounds(items).map(r => ({
            id: r.item.id,
            displayText: r.promptText,
            answer: r.answer,
            options: r.options,
            tipp: r.tipp,
            speakText: r.spokenText,
        }));
    }

    // Article mode: bare word, fixed der/die/das order (no shuffle) so the
    // learner keeps muscle-memory positions.
    return shuffle(items).map((item: PracticeItem) => ({
        id: item.id,
        displayText: item.word,
        hint: item.hint,
        answer: item.answer,
        options: item.options,
        tipp: getTipp(item.word, item.gender),
        speakText: item.word,
    }));
}

export function useGameState(filter: FilterType, mode: GameMode = 'article') {
    const [queue, setQueue] = useState<Round[]>([]);
    const [currentWord, setCurrentWord] = useState<Round | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [tippText, setTippText] = useState<string | null>(null);
    const [isAwaitingNext, setIsAwaitingNext] = useState(false);
    const [timeBank, setTimeBank] = useState(INITIAL_TIME_BANK);

    // Timing refs
    const answerTimerRef = useRef<number | null>(null);
    const wordPresentedAtRef = useRef<number>(0);       // when word was shown
    const feedbackShownAtRef = useRef<number>(0);        // when answer was submitted
    const handleAnswerRef = useRef<((selectedArticle: string, timedOut?: boolean) => void) | null>(null);

    const clearAnswerTimer = useCallback(() => {
        if (answerTimerRef.current) {
            clearTimeout(answerTimerRef.current);
            answerTimerRef.current = null;
        }
    }, []);

    // Initialize / reset game when filter or mode changes
    useEffect(() => {
        clearAnswerTimer();
        const rounds = buildQueue(filter, mode);
        setQueue(rounds);
        setCurrentWord(rounds.length > 0 ? rounds[0] : null);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setFeedback(null);
        setTippText(null);
        setIsAwaitingNext(false);
        setTimeBank(INITIAL_TIME_BANK);
    }, [filter, mode, clearAnswerTimer]);

    // Play audio whenever a new round is displayed
    useEffect(() => {
        if (currentWord && !isAwaitingNext) {
            playWord(currentWord.speakText);
        }
    }, [currentWord, isAwaitingNext]);

    const handleAnswer = useCallback((selectedArticle: string, timedOut = false) => {
        if (!currentWord || isAwaitingNext) return;

        clearAnswerTimer();
        feedbackShownAtRef.current = Date.now();

        const isCorrect = selectedArticle === currentWord.answer;
        
        if (isCorrect) {
            setFeedback('correct');
            setScore(s => s + 1);
            setStreak(s => s + 1);

            // Chess clock: time saved from answering fast gets added to bank
            const elapsed = Date.now() - wordPresentedAtRef.current;
            const saved = Math.min(TIME_PER_WORD - elapsed, BONUS_CAP);
            if (saved > 0) {
                setTimeBank(t => t + saved);
            }
        } else {
            setFeedback('incorrect');
            setStreak(s => {
                setBestStreak(prev => Math.max(prev, s));
                return 0;
            });
        }

        const tipp = timedOut
            ? `Time's up! The correct answer is "${currentWord.answer}".`
            : currentWord.tipp;
        setTippText(tipp);
        setIsAwaitingNext(true);

        setQueue(prevQueue => {
            const newQueue = [...prevQueue];
            const item = newQueue.shift();
            if (!item) return newQueue;
            if (!isCorrect) {
                const offset = Math.floor(Math.random() * 4) + 2;
                const insertIndex = Math.min(offset, newQueue.length);
                newQueue.splice(insertIndex, 0, item);
            }
            return newQueue;
        });

    }, [currentWord, isAwaitingNext, clearAnswerTimer]);

    useEffect(() => {
        handleAnswerRef.current = handleAnswer;
    }, [handleAnswer]);

    /** Called when user presses Next (or auto-advance fires).
     *  Returns the bonus ms recovered if user pressed Next early. */
    const handleNext = useCallback((grantBonus = false) => {
        clearAnswerTimer();

        if (grantBonus) {
            const feedbackElapsed = Date.now() - feedbackShownAtRef.current;
            const bonus = Math.max(0, 2000 - feedbackElapsed); // remaining from the 2s window
            if (bonus > 0) {
                setTimeBank(t => t + bonus);
            }
        }

        setIsAwaitingNext(false);
        setFeedback(null);
        setTippText(null);
        
        setQueue(prevQueue => {
            if (prevQueue.length > 0) {
                setCurrentWord(prevQueue[0]);
            } else {
                setCurrentWord(null);
            }
            return prevQueue;
        });
    }, [clearAnswerTimer]);

    // Start answer timer using time bank whenever a new word is presented
    useEffect(() => {
        if (currentWord && !isAwaitingNext) {
            clearAnswerTimer();
            wordPresentedAtRef.current = Date.now();

            answerTimerRef.current = window.setTimeout(() => {
                // Time's up — drain from bank
                setTimeBank(t => {
                    const remaining = t - TIME_PER_WORD;
                    if (remaining <= 0) {
                        // Bank depleted — still allow play but mark wrong
                    }
                    return Math.max(0, remaining);
                });

                if (handleAnswerRef.current && currentWord) {
                    const wrongOption = currentWord.options.find(o => o !== currentWord.answer) || currentWord.options[0];
                    handleAnswerRef.current(wrongOption, true);
                }
            }, TIME_PER_WORD);
        }

        return () => clearAnswerTimer();
    }, [currentWord, isAwaitingNext, clearAnswerTimer]);

    const handleReplay = useCallback(() => {
        if (currentWord) {
            playWord(currentWord.speakText);
        }
    }, [currentWord]);

    useEffect(() => {
        return () => clearAnswerTimer();
    }, [clearAnswerTimer]);

    return {
        currentWord,
        score,
        streak,
        bestStreak,
        feedback,
        tippText,
        isAwaitingNext,
        handleAnswer,
        handleNext,
        handleReplay,
        itemsLeft: queue.length,
        timeBank,
    };
}
