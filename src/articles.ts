// Articles mode — the original game: show a bare noun, pick its der/die/das.
//
// This is the Nominativ-singular special case of the case engine, but it has two
// rules the general engine doesn't: the options stay in FIXED der/die/das order
// (muscle memory), and the prompt is just the word. Expressed as a
// RoundGenerator so it sits behind the same contract as cases and plurals.

import { getTipp, getHint } from './rules';
import { genderHint, type Hint } from './hints';
import { type PracticeItem } from './data';
import { shuffle } from './utils/random';
import type { PracticeRound } from './round';

/** An article round is just a `PracticeRound` — it carries no extra mode data
 *  (its answer is the noun's dictionary Nominativ-singular article, its options
 *  stay in fixed der/die/das order, and the bare word is safe to speak). */
export type ArticleRound = PracticeRound;

/** Build a single article round from a noun. Options keep the noun's own fixed
 *  der/die/das order — no shuffle — to preserve swipe/key muscle memory. */
export function buildArticleRound(item: PracticeItem): ArticleRound {
    const hints: Hint[] = [
        { kind: 'rule', text: getHint(item.word, item.gender) },
        genderHint(item.word, item.gender),
    ];
    return {
        item,
        promptText: item.word,
        spokenText: item.word,
        speakOnShowSafe: true,
        answer: item.answer,
        options: item.options,        // fixed der/die/das order — intentionally not shuffled
        tipp: getTipp(item.word, item.gender),
        hints,
    };
}

/** Build a shuffled list of article rounds — one per noun in the pool. */
export function generateArticleRounds(pool: PracticeItem[]): ArticleRound[] {
    return shuffle(pool).map(buildArticleRound);
}
