import { describe, it, expect } from 'vitest';
import {
    MAIN_QUEST,
    chapterById,
    chapterToStory,
    buildChapterRounds,
    generateChapterRoundsFor,
} from './index';
import { generateItems } from '../data';
import { articleFor, caseForSurface, type Case } from '../declension';
import { pluralForm } from '../plurals';
import { CH1_GENUS, CH1_PLURAL, CH1_AKKUSATIV, CH1_DATIV } from './ch1';

const pool = generateItems();
const byWord = new Map(pool.map(i => [i.word, i]));

describe('MAIN_QUEST integrity', () => {
    it('has unique, resolvable chapter ids', () => {
        const ids = MAIN_QUEST.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(chapterById(id)?.id).toBe(id);
    });

    it('follows the book TOC order: genus → plural → akkusativ → dativ', () => {
        expect(MAIN_QUEST.map(c => c.topic)).toEqual(['genus', 'plural', 'kasus-akk', 'kasus-dat']);
    });

    it('every chapter produces at least a few playable rounds', () => {
        for (const ch of MAIN_QUEST) {
            const rounds = buildChapterRounds(ch, pool);
            expect(rounds.length, `${ch.id} should have blanks`).toBeGreaterThanOrEqual(3);
        }
    });
});

describe('every chapter round is well-formed and graded-once', () => {
    it('carries storyContext, a contained answer, and contiguous blank indices', () => {
        for (const ch of MAIN_QUEST) {
            const rounds = buildChapterRounds(ch, pool);
            rounds.forEach((r, i) => {
                expect(r.storyContext, `${ch.id}#${i}`).toBeTruthy();
                expect(r.options).toContain(r.answer);
                expect(r.storyContext!.blankIndex).toBe(i);
                expect(r.storyContext!.blankCount).toBe(rounds.length);
            });
        }
    });
});

describe('genus chapter: answer is the nom-sg article, fixed der/die/das', () => {
    const rounds = buildChapterRounds(CH1_GENUS, pool);

    it('every answer equals the noun’s dictionary article and options are der/die/das', () => {
        for (const r of rounds) {
            const item = byWord.get(r.item.word)!;
            expect(r.answer).toBe(articleFor(item.gender, 'nom', 'sg'));
            expect([...r.options].sort()).toEqual(['das', 'der', 'die']);
        }
    });

    it('options stay in FIXED der/die/das order (muscle memory)', () => {
        for (const r of rounds) {
            expect(r.options).toEqual(['der', 'die', 'das']);
        }
    });
});

describe('plural chapter: answer is the stored plural form', () => {
    const rounds = buildChapterRounds(CH1_PLURAL, pool);

    it('every answer is the noun’s real plural', () => {
        for (const r of rounds) {
            const item = byWord.get(r.item.word)!;
            expect(r.answer).toBe(pluralForm(item));
        }
    });
});

describe('case chapters: answer is the surface article, case read off it', () => {
    function assertCaseChapter(rounds: ReturnType<typeof buildChapterRounds>, expectCase: Case) {
        expect(rounds.length).toBeGreaterThan(0);
        for (const r of rounds) {
            const item = byWord.get(r.item.word)!;
            // The answer must be a definite article valid for this noun in the
            // expected case (number-aware: items here are singular nouns).
            const expected = articleFor(item.gender, expectCase, 'sg');
            expect(r.answer, `${r.item.word} in ${expectCase}`).toBe(expected);
            // And the answer's case (read off the article) includes the expected case.
            const inferred = caseForSurface(item.gender, r.answer);
            const cases = Array.isArray(inferred) ? inferred : [inferred];
            expect(cases).toContain(expectCase);
        }
    }

    it('akkusativ chapter answers are all accusative articles', () => {
        assertCaseChapter(buildChapterRounds(CH1_AKKUSATIV, pool), 'akk');
    });

    it('dativ chapter answers are all dative articles', () => {
        assertCaseChapter(buildChapterRounds(CH1_DATIV, pool), 'dat');
    });
});

describe('generateChapterRoundsFor', () => {
    it('plays the requested chapter by id', () => {
        const rounds = generateChapterRoundsFor('ch1-genus', pool);
        expect(rounds.every(r => r.storyContext!.storyId === 'ch1-genus')).toBe(true);
    });

    it('falls back to the first chapter for an unknown id', () => {
        const rounds = generateChapterRoundsFor('nope', pool);
        expect(rounds[0].storyContext!.storyId).toBe(MAIN_QUEST[0].id);
    });
});

describe('prompt shows the noun after the blank (genus/kasus)', () => {
    it('genus promptText keeps the noun visible: "… ___ Hund"', () => {
        const rounds = buildChapterRounds(CH1_GENUS, pool);
        // Find the round for "der Hund".
        const hund = rounds.find(r => r.item.word === 'Hund');
        expect(hund).toBeTruthy();
        expect(hund!.promptText).toMatch(/___\s+Hund/);
    });

    it('chapterToStory yields the topic as the story mode', () => {
        expect(chapterToStory(CH1_GENUS).mode).toBe('genus');
        expect(chapterToStory(CH1_DATIV).mode).toBe('kasus-dat');
    });
});
