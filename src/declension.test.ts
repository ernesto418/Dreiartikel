import { describe, it, expect } from 'vitest';
import { articleFor, optionsForCase, declineNoun, type Case } from './declension';
import { articleForGender, type Gender } from './rules';

const GENDERS: Gender[] = ['m', 'f', 'n'];

describe('articleFor — definite article table', () => {
    it('returns the full singular table', () => {
        // case → { m, f, n }
        const expected: Record<Case, Record<Gender, string>> = {
            nom: { m: 'der', f: 'die', n: 'das' },
            akk: { m: 'den', f: 'die', n: 'das' },
            dat: { m: 'dem', f: 'der', n: 'dem' },
            gen: { m: 'des', f: 'der', n: 'des' },
        };
        for (const c of Object.keys(expected) as Case[]) {
            for (const g of GENDERS) {
                expect(articleFor(g, c, 'sg'), `${c}/${g}`).toBe(expected[c][g]);
            }
        }
    });

    it('returns the plural column', () => {
        expect(articleFor('m', 'nom', 'pl')).toBe('die');
        expect(articleFor('m', 'akk', 'pl')).toBe('die');
        expect(articleFor('m', 'dat', 'pl')).toBe('den');
        expect(articleFor('m', 'gen', 'pl')).toBe('der');
    });
});

describe('seam: articleForGender === articleFor(g, nom, sg)', () => {
    it('agrees for every gender', () => {
        for (const g of GENDERS) {
            expect(articleForGender(g)).toBe(articleFor(g, 'nom', 'sg'));
        }
    });
});

describe('optionsForCase', () => {
    it('akkusativ has 3 distinct forms', () => {
        expect(optionsForCase('akk').sort()).toEqual(['das', 'den', 'die']);
    });

    it('dativ collapses to exactly 2 forms (dem, der)', () => {
        expect(optionsForCase('dat').sort()).toEqual(['dem', 'der']);
    });

    it('always includes every gender’s correct answer for the case', () => {
        for (const c of ['nom', 'akk', 'dat', 'gen'] as Case[]) {
            const opts = optionsForCase(c);
            for (const g of GENDERS) {
                expect(opts, `${c}/${g}`).toContain(articleFor(g, c, 'sg'));
            }
        }
    });
});

describe('declineNoun (n-Deklination)', () => {
    it('leaves non-weak nouns unchanged in every case', () => {
        for (const c of ['nom', 'akk', 'dat', 'gen'] as Case[]) {
            expect(declineNoun('Hund', false, c)).toBe('Hund');
        }
    });

    it('adds -n to a weak noun ending in -e outside the nominative', () => {
        expect(declineNoun('Junge', true, 'nom')).toBe('Junge');   // nom unchanged
        expect(declineNoun('Junge', true, 'akk')).toBe('Jungen');
        expect(declineNoun('Junge', true, 'dat')).toBe('Jungen');
        expect(declineNoun('Franzose', true, 'dat')).toBe('Franzosen');
        expect(declineNoun('Name', true, 'akk')).toBe('Namen');
    });

    it('adds -en to a weak noun not ending in -e', () => {
        expect(declineNoun('Student', true, 'akk')).toBe('Studenten');
    });
});
