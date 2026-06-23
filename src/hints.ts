// The hint system. A Hint is a piece of help shown — with the timer frozen —
// without revealing the answer. Each `kind` is a distinct help type with its own
// budget; adding a new kind means: add it to HintKind, produce it in a builder
// below (or in the mode that owns the data), and optionally branch on `kind` in
// the UI. The budget/freeze machinery in useGameState is kind-agnostic.

import type { Gender } from './rules';

export type HintKind = 'rule' | 'gender' | 'plural';

export interface Hint {
    kind: HintKind;
    text: string;
}

/** How many times each kind may be used per session. */
export const HINT_BUDGET: Record<HintKind, number> = {
    rule: 3,
    gender: 3,
    plural: 3,
};

/** Order hints appear in the UI. */
export const HINT_KINDS: HintKind[] = ['rule', 'gender', 'plural'];

const GENDER_WORD: Record<Gender, string> = {
    m: 'masculine',
    f: 'feminine',
    n: 'neuter',
};

/** Reveals only the noun's gender (e.g. "Krawatte is feminine.") — never the
 *  article, so the learner still maps gender → case form themselves. */
export function genderHint(word: string, gender: Gender): Hint {
    return { kind: 'gender', text: `${word} is ${GENDER_WORD[gender]}.` };
}
