import { useState, useEffect, useCallback, useRef } from 'react';
import { generateItems, shuffle, type PracticeItem } from '../data';
import { hasRule, getTipp, getHint } from '../rules';
import { generateRounds } from '../sentences';
import { genderHint, HINT_BUDGET, HINT_KINDS, type Hint, type HintKind } from '../hints';
import { playWord, stopSpeech } from '../utils/speech';

const HINT_FREEZE_MS = 3000; // how long the timer freezes while a hint shows

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
    /** Spoken when the round appears. Empty in case mode — speaking the full
     *  sentence up front would reveal the article. */
    speakOnShow: string;
    /** Spoken after the learner answers (reinforcement). The full correct
     *  sentence in case mode; empty in article mode. */
    speakOnAnswer: string;
    /** Replay button audio: what the round is "about". */
    speakReplay: string;
    /** Help the learner can reveal before answering — never the solution. */
    hints: Hint[];
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
            speakOnShow: '',                 // no up-front audio — would leak the article
            speakOnAnswer: r.spokenText,     // full correct sentence, after answering
            speakReplay: r.item.word,        // re-hear just the noun (no article)
            hints: r.hints,
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
        speakOnShow: item.word,
        speakOnAnswer: '',
        speakReplay: item.word,
        hints: [
            { kind: 'rule', text: getHint(item.word, item.gender) },
            genderHint(item.word, item.gender),
        ],
    }));
}

export function useGameState(filter: FilterType, mode: GameMode = 'article', active = true) {
    const [queue, setQueue] = useState<Round[]>([]);
    const [currentWord, setCurrentWord] = useState<Round | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [tippText, setTippText] = useState<string | null>(null);
    const [isAwaitingNext, setIsAwaitingNext] = useState(false);
    const [timeBank, setTimeBank] = useState(INITIAL_TIME_BANK);

    // Answer-flow state — what's happening *this turn*. Owned here so there is a
    // single source of truth (previously this was split into App.tsx).
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showTipp, setShowTipp] = useState(false);

    // Hint system — a separate budget per hint kind.
    const [hintsRemaining, setHintsRemaining] = useState<Record<HintKind, number>>({ ...HINT_BUDGET });
    const [revealedHint, setRevealedHint] = useState<Hint | null>(null);
    const [isFrozen, setIsFrozen] = useState(false);

    // Timing refs
    const answerTimerRef = useRef<number | null>(null);
    const autoAdvanceRef = useRef<number | null>(null);  // 2s "next" timer on correct
    const freezeTimerRef = useRef<number | null>(null);  // hint freeze (3s) timer
    const wordPresentedAtRef = useRef<number>(0);       // when word was shown
    const answerDeadlineRef = useRef<number>(0);         // when the answer timer fires
    const frozenRemainingRef = useRef<number>(0);       // ms left when frozen
    const feedbackShownAtRef = useRef<number>(0);        // when answer was submitted
    const handleAnswerRef = useRef<((selectedArticle: string, timedOut?: boolean) => void) | null>(null);

    const clearAnswerTimer = useCallback(() => {
        if (answerTimerRef.current) {
            clearTimeout(answerTimerRef.current);
            answerTimerRef.current = null;
        }
    }, []);

    const clearAutoAdvance = useCallback(() => {
        if (autoAdvanceRef.current) {
            clearTimeout(autoAdvanceRef.current);
            autoAdvanceRef.current = null;
        }
    }, []);

    const clearFreeze = useCallback(() => {
        if (freezeTimerRef.current) {
            clearTimeout(freezeTimerRef.current);
            freezeTimerRef.current = null;
        }
        setIsFrozen(false);
    }, []);

    // Initialize / reset game when filter or mode changes
    useEffect(() => {
        clearAnswerTimer();
        clearAutoAdvance();
        clearFreeze();
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
        setSelectedOption(null);
        setShowTipp(false);
        setHintsRemaining({ ...HINT_BUDGET });   // refill hints on a new run
        setRevealedHint(null);
    }, [filter, mode, clearAnswerTimer, clearAutoAdvance, clearFreeze]);

    // Play audio whenever a new round is displayed (only while the game is on
    // screen). Empty speakOnShow (case mode) is a no-op so the article isn't
    // revealed before the learner answers.
    useEffect(() => {
        if (active && currentWord && !isAwaitingNext && currentWord.speakOnShow) {
            playWord(currentWord.speakOnShow);
        }
    }, [active, currentWord, isAwaitingNext]);

    // Cut off any audio in progress the moment the game leaves the screen.
    useEffect(() => {
        if (!active) stopSpeech();
    }, [active]);

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

        // Reinforce with the full correct sentence (case mode); no-op in article mode.
        if (currentWord.speakOnAnswer) {
            playWord(currentWord.speakOnAnswer);
        }

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

    // ─── High-level turn actions (the API the UI calls) ────────────────

    /** Submit an answer. On a correct answer, auto-advance after 2s; on a wrong
     *  answer, reveal the tipp and wait for the learner to press Next. */
    const selectAnswer = useCallback((option: string) => {
        if (!currentWord || isAwaitingNext) return;
        // Answering ends any active hint freeze.
        clearFreeze();
        frozenRemainingRef.current = 0;
        setRevealedHint(null);
        setSelectedOption(option);

        const wasCorrect = option === currentWord.answer;
        handleAnswer(option);

        if (wasCorrect) {
            setShowTipp(false);
            autoAdvanceRef.current = window.setTimeout(() => {
                handleNext(false);
                setSelectedOption(null);
                setShowTipp(false);
            }, 2000);
        } else {
            setShowTipp(true);
            clearAutoAdvance();
        }
    }, [currentWord, isAwaitingNext, handleAnswer, handleNext, clearAutoAdvance, clearFreeze]);

    /** Reveal the explanation on a wrong answer ("Know why" button). */
    const knowWhy = useCallback(() => {
        clearAutoAdvance();
        setShowTipp(true);
    }, [clearAutoAdvance]);

    /** Advance to the next round (Next button / Space). */
    const next = useCallback((grantBonus = true) => {
        clearAutoAdvance();
        clearFreeze();
        frozenRemainingRef.current = 0;
        setSelectedOption(null);
        setShowTipp(false);
        setRevealedHint(null);
        handleNext(grantBonus);
    }, [clearAutoAdvance, clearFreeze, handleNext]);

    /** Reveal a hint of the given kind for the current round, freezing the timer
     *  for HINT_FREEZE_MS. Costs one use from that kind's budget. */
    const useHint = useCallback((kind: HintKind) => {
        if (!currentWord || isAwaitingNext || isFrozen) return;
        if (hintsRemaining[kind] <= 0) return;

        const hint = currentWord.hints.find(h => h.kind === kind);
        if (!hint) return;

        // Freeze the answer timer, stashing how much time was left to resume with.
        clearAnswerTimer();
        frozenRemainingRef.current = Math.max(0, answerDeadlineRef.current - Date.now());

        setRevealedHint(hint);
        setHintsRemaining(prev => ({ ...prev, [kind]: prev[kind] - 1 }));
        setIsFrozen(true);

        freezeTimerRef.current = window.setTimeout(() => {
            setIsFrozen(false); // timer effect resumes with the stashed remaining
            freezeTimerRef.current = null;
        }, HINT_FREEZE_MS);
    }, [currentWord, isAwaitingNext, isFrozen, hintsRemaining, clearAnswerTimer]);

    // Clear the auto-advance and freeze timers if the game leaves the screen.
    useEffect(() => {
        if (!active) {
            clearAutoAdvance();
            clearFreeze();
        }
        return () => { clearAutoAdvance(); clearFreeze(); };
    }, [active, clearAutoAdvance, clearFreeze]);

    // Start the answer timer whenever a word is presented and not frozen. A hint
    // freeze pauses this (isFrozen) and stashes the remaining time, which is
    // consumed here on resume so the countdown picks up where it left off.
    useEffect(() => {
        if (active && currentWord && !isAwaitingNext && !isFrozen) {
            clearAnswerTimer();

            const resuming = frozenRemainingRef.current > 0;
            const duration = resuming ? frozenRemainingRef.current : TIME_PER_WORD;
            frozenRemainingRef.current = 0;
            if (!resuming) wordPresentedAtRef.current = Date.now();
            answerDeadlineRef.current = Date.now() + duration;

            answerTimerRef.current = window.setTimeout(() => {
                // Time's up — drain from bank
                setTimeBank(t => Math.max(0, t - TIME_PER_WORD));

                if (handleAnswerRef.current && currentWord) {
                    const wrongOption = currentWord.options.find(o => o !== currentWord.answer) || currentWord.options[0];
                    handleAnswerRef.current(wrongOption, true);
                }
            }, duration);
        }

        return () => clearAnswerTimer();
    }, [active, currentWord, isAwaitingNext, isFrozen, clearAnswerTimer]);

    const handleReplay = useCallback(() => {
        if (currentWord) {
            // After answering in case mode, replay the full sentence; otherwise
            // the noun on its own (which never leaks the article).
            const text = isAwaitingNext && currentWord.speakOnAnswer
                ? currentWord.speakOnAnswer
                : currentWord.speakReplay;
            playWord(text);
        }
    }, [currentWord, isAwaitingNext]);

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
        // Answer-flow state (this turn)
        selectedOption,
        showTipp,
        // Hint system
        hintsRemaining,
        revealedHint,
        isFrozen,
        availableHintKinds: currentWord
            ? HINT_KINDS.filter(k => currentWord.hints.some(h => h.kind === k))
            : [],
        // Turn actions — the API the UI calls
        selectAnswer,
        knowWhy,
        next,
        useHint,
        replay: handleReplay,
        itemsLeft: queue.length,
        timeBank,
    };
}
