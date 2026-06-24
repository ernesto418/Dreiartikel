import { describe, it, expect } from 'vitest';
import { STORIES, buildStoryRounds, generateStoryRounds } from './stories';
import { generateItems, type PracticeItem } from './data';
import { pluralForm, hasPlural } from './plurals';

// Story mode is a narrative wrapper over the plural engine: each blank in a
// stored letter becomes ONE PracticeRound, answered with the noun's plural, and
// the surrounding text rides along as `storyContext`. These guards protect the
// two failure modes hand-entered story data invites: a blank word that doesn't
// exist (or has no plural — unanswerable), and a prompt/hint that leaks the
// answer before the learner picks it.

const items = generateItems();
const byWord = new Map(items.map(i => [i.word, i]));

/** Every blank word across all stories, in reading order, with its story id. */
function allBlankWords(): { storyId: string; word: string }[] {
    const out: { storyId: string; word: string }[] = [];
    for (const story of STORIES) {
        for (const line of story.lines) {
            for (const seg of line) {
                if (seg.kind === 'blank') out.push({ storyId: story.id, word: seg.word });
            }
        }
    }
    return out;
}

const TOTAL_BLANKS = allBlankWords().length;

// 1. Data integrity per story — the typo-guard, mirroring data.test.ts's curated
//    set checks: a blank word must exist AND be answerable (have a plural).
describe('story data integrity', () => {
    it('exposes at least one story', () => {
        expect(STORIES.length).toBeGreaterThan(0);
    });

    for (const story of STORIES) {
        describe(`"${story.id}"`, () => {
            it('has at least one blank segment', () => {
                const blanks = story.lines
                    .flat()
                    .filter(seg => seg.kind === 'blank');
                expect(blanks.length, `${story.id} has no blanks`).toBeGreaterThan(0);
            });

            it('every blank word exists in the dataset and has a plural', () => {
                for (const line of story.lines) {
                    for (const seg of line) {
                        if (seg.kind !== 'blank') continue;
                        const item = byWord.get(seg.word);
                        expect(item, `${story.id}: unknown blank word "${seg.word}"`).toBeDefined();
                        expect(
                            hasPlural(item as PracticeItem),
                            `${story.id}: blank "${seg.word}" has no plural (unanswerable)`,
                        ).toBe(true);
                    }
                }
            });
        });
    }
});

// 2. Generator output — one answerable round per blank, with stable options.
describe('generateStoryRounds', () => {
    const rounds = generateStoryRounds(items);

    it('returns one round per blank across all stories', () => {
        expect(rounds.length).toBe(TOTAL_BLANKS);
    });

    it('every round answers with the plural of its blank word', () => {
        const blanks = allBlankWords();
        for (let i = 0; i < rounds.length; i++) {
            const r = rounds[i];
            const expectedItem = byWord.get(blanks[i].word) as PracticeItem;
            expect(
                r.answer,
                `round ${i} (${blanks[i].word}) answer`,
            ).toBe(pluralForm(expectedItem));
            // The round's own item must be the right noun too.
            expect(r.item.word, `round ${i} item`).toBe(blanks[i].word);
        }
    });

    it('every round has exactly 3 options including the answer, all distinct', () => {
        for (let i = 0; i < rounds.length; i++) {
            const r = rounds[i];
            expect(r.options, `round ${i} options must include answer`).toContain(r.answer);
            expect(r.options.length, `round ${i} option count`).toBe(3);
            expect(new Set(r.options).size, `round ${i} distinct options`).toBe(r.options.length);
        }
    });

    it('every round carries a storyContext', () => {
        for (let i = 0; i < rounds.length; i++) {
            expect(rounds[i].storyContext, `round ${i} storyContext`).toBeDefined();
        }
    });

    // The mode ignores the pool filter (a story is a fixed text), so even an
    // empty pool yields the full, answerable story.
    it('ignores the pool — an empty pool still plays the whole story', () => {
        const fromEmpty = generateStoryRounds([]);
        expect(fromEmpty.length).toBe(TOTAL_BLANKS);
        for (const r of fromEmpty) {
            expect(r.options).toContain(r.answer);
        }
    });
});

// 3. storyContext coherence — the narrative frame must be internally consistent
//    so the UI can render and tally the cumulative letter.
describe('storyContext coherence', () => {
    for (const story of STORIES) {
        describe(`"${story.id}"`, () => {
            const rounds = buildStoryRounds(story, items.filter(hasPlural));
            const blankWords = story.lines
                .flat()
                .filter(seg => seg.kind === 'blank')
                .map(seg => (seg as { kind: 'blank'; word: string }).word);
            const N = blankWords.length;

            it('blankIndex runs 0..N-1 contiguously and uniquely, in reading order', () => {
                const indices = rounds.map(r => r.storyContext!.blankIndex);
                expect(indices).toEqual([...Array(N).keys()]);
            });

            it('all rounds share blankCount === N', () => {
                for (let i = 0; i < rounds.length; i++) {
                    expect(rounds[i].storyContext!.blankCount, `round ${i} blankCount`).toBe(N);
                }
            });

            it('each round storyContext.answer equals the round answer', () => {
                for (let i = 0; i < rounds.length; i++) {
                    expect(
                        rounds[i].storyContext!.answer,
                        `round ${i} context answer`,
                    ).toBe(rounds[i].answer);
                }
            });

            it('every round carries the right story id and title', () => {
                for (const r of rounds) {
                    expect(r.storyContext!.storyId).toBe(story.id);
                    expect(r.storyContext!.title).toBe(story.title);
                }
            });

            it('the lines view resolves each blank to the plural of its word', () => {
                // The shared view is identical across rounds; read it off the first.
                const view = rounds[0].storyContext!.lines;
                const blankViews = view
                    .flat()
                    .filter(seg => seg.kind === 'blank');
                expect(blankViews.length, 'view blank count').toBe(N);
                for (let i = 0; i < blankViews.length; i++) {
                    const expectedItem = byWord.get(blankWords[i]) as PracticeItem;
                    expect(blankViews[i].blankIndex, `view blank ${i} index`).toBe(i);
                    expect(
                        blankViews[i].answer,
                        `view blank ${i} (${blankWords[i]}) answer`,
                    ).toBe(pluralForm(expectedItem));
                }
            });
        });
    }
});

// 4. No answer leak — the prompt shows the slot as ___, never the plural, and no
//    hint reveals the form (mirrors plurals.test.ts's hint-leak test).
describe('story rounds never leak the answer', () => {
    const rounds = generateStoryRounds(items);

    /** Whole-word presence, so "Fotos" in the prompt wouldn't hide inside a
     *  longer word and a short answer wouldn't false-positive on a substring. */
    function containsWord(haystack: string, needle: string): boolean {
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|\\W)${escaped}(\\W|$)`).test(haystack);
    }

    it('promptText shows a ___ blank and never the answer', () => {
        for (let i = 0; i < rounds.length; i++) {
            const r = rounds[i];
            expect(r.promptText, `round ${i} prompt should mark the blank`).toContain('___');
            expect(
                containsWord(r.promptText, r.answer),
                `round ${i} prompt leaks "${r.answer}": ${r.promptText}`,
            ).toBe(false);
        }
    });

    it('no hint reveals the plural form', () => {
        for (let i = 0; i < rounds.length; i++) {
            const r = rounds[i];
            for (const h of r.hints) {
                expect(
                    h.text,
                    `round ${i} hint (${h.kind}) leaks "${r.answer}"`,
                ).not.toContain(r.answer);
            }
        }
    });
});
