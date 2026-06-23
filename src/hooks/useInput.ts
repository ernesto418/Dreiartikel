import { useEffect, useCallback } from 'react';
import type { Round } from './useGameState';

// Keyboard arrows map to option *positions*, not fixed articles, so the same
// handler works whether a round has 3 options (der/die/das, den/die/das,
// plural answer + 2 decoys) or 2 (Dativ: dem/der). Order: Left → Down → Right.
const KEY_ORDER = ['ArrowLeft', 'ArrowDown', 'ArrowRight'];

/** The arrow glyph shown on the option at `idx` (desktop keyboard hint). With 3
 *  options it's ←/↓/→; with 2 (Dativ) the middle is skipped so they read ← →. */
export function glyphForOptionSlot(idx: number, count: number): string {
    if (count === 2) return idx === 0 ? '←' : '→';
    return ['←', '↓', '→'][idx] ?? '';
}

interface UseInputArgs {
    /** Whether the game is on screen — gates keyboard handling. */
    active: boolean;
    currentWord: Round | null;
    isAwaitingNext: boolean;
    /** Submit an answer for the given option string. */
    onSelectOption: (option: string) => void;
    /** Advance to the next round (Space when awaiting). */
    onNext: (grantBonus?: boolean) => void;
}

/** Keyboard input (desktop), mapped positionally to the current round's options.
 *  Mobile uses taps on the option buttons — there is no swipe. */
export function useInput({ active, currentWord, isAwaitingNext, onSelectOption, onNext }: UseInputArgs) {
    // Map an arrow slot (Left/Down/Right) to the option in that position. With 3
    // options the mapping is direct; with 2 (Dativ), the middle slot is dropped
    // so Left/Right hit options[0]/[1].
    const optionForKeySlot = useCallback((slot: number): string | undefined => {
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

    useEffect(() => {
        if (!active) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const slot = KEY_ORDER.indexOf(e.key);
            if (slot >= 0 && !isAwaitingNext && currentWord) {
                const option = optionForKeySlot(slot);
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
    }, [active, isAwaitingNext, currentWord, onSelectOption, onNext, optionForKeySlot]);
}
