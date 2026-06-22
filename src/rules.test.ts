import { describe, it, expect } from 'vitest';
import { articleForGender, genderForArticle, hasRule, getTipp, getHint } from './rules';

describe('article ↔ gender mapping', () => {
    it('maps gender to its Nominativ-singular article', () => {
        expect(articleForGender('m')).toBe('der');
        expect(articleForGender('f')).toBe('die');
        expect(articleForGender('n')).toBe('das');
    });

    it('round-trips article → gender → article', () => {
        for (const a of ['der', 'die', 'das'] as const) {
            expect(articleForGender(genderForArticle(a))).toBe(a);
        }
    });
});

describe('hasRule', () => {
    it('recognises strong feminine/neuter/masculine suffixes', () => {
        expect(hasRule('Zeitung', 'f')).toBe(true);   // -ung
        expect(hasRule('Mädchen', 'n')).toBe(true);   // -chen
        expect(hasRule('Frühling', 'm')).toBe(true);  // -ling
    });

    it('returns false when the gender contradicts the matched rule', () => {
        expect(hasRule('Zeitung', 'm')).toBe(false);
    });

    it('returns false for words with no pattern', () => {
        expect(hasRule('Mann', 'm')).toBe(false);
    });
});

describe('getTipp', () => {
    it('explains a matched rule', () => {
        expect(getTipp('Zeitung', 'f')).toMatch(/-ung.*feminine/);
        expect(getTipp('Mädchen', 'n')).toMatch(/[Dd]iminutive/);
    });

    it('falls back to a memorize message with the right gender label', () => {
        expect(getTipp('Mann', 'm')).toMatch(/masculine/);
        expect(getTipp('Frau', 'f')).toMatch(/feminine/);
        expect(getTipp('Haus', 'n')).toMatch(/neuter/);
    });

    it('does not claim a rule when the gender is the exception to it', () => {
        // -e is usually feminine; "der Name" is masculine, so no -e rule should fire.
        expect(getTipp('Name', 'm')).toMatch(/best memorized/);
    });
});

describe('getHint', () => {
    it('points at the pattern location without naming the gender or article', () => {
        const hint = getHint('Zeitung', 'f'); // -ung → feminine
        expect(hint).toMatch(/-ung/);
        // Must not spoil: no article and no gender word.
        expect(hint).not.toMatch(/\b(der|die|das|feminine|masculine|neuter)\b/);
    });

    it('says it is a memorize word when no pattern applies', () => {
        expect(getHint('Mann', 'm')).toMatch(/memorize/);
        expect(getHint('Mann', 'm')).not.toMatch(/\b(der|die|das)\b/);
    });
});
