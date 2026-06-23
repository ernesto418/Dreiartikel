import { describe, it, expect } from 'vitest';
import { genderHint, HINT_BUDGET, HINT_KINDS } from './hints';

describe('genderHint', () => {
    it('names the gender in plain English', () => {
        expect(genderHint('Hund', 'm').text).toBe('Hund is masculine.');
        expect(genderHint('Frau', 'f').text).toBe('Frau is feminine.');
        expect(genderHint('Haus', 'n').text).toBe('Haus is neuter.');
    });

    it('never leaks the article', () => {
        for (const g of ['m', 'f', 'n'] as const) {
            expect(genderHint('Wort', g).text).not.toMatch(/\b(der|die|das)\b/);
        }
    });

    it('is tagged with the gender kind', () => {
        expect(genderHint('Hund', 'm').kind).toBe('gender');
    });
});

describe('hint configuration', () => {
    it('budgets every declared kind', () => {
        for (const kind of HINT_KINDS) {
            expect(HINT_BUDGET[kind]).toBeGreaterThan(0);
        }
    });
});
