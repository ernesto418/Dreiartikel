import { describe, it, expect } from 'vitest';
import {
    TEMPLATES,
    buildRound,
    matches,
    isEligible,
    pickRound,
    generateRounds,
    type SentenceTemplate,
} from './sentences';
import type { PracticeItem } from './data';

function item(partial: Partial<PracticeItem> & { word: string; gender: PracticeItem['gender'] }): PracticeItem {
    return {
        id: partial.id ?? 't',
        word: partial.word,
        gender: partial.gender,
        answer: 'der',
        hint: partial.word,
        options: ['der', 'die', 'das'],
        category: 'Test',
        animacy: partial.animacy ?? 'thing',
        pluralOnly: partial.pluralOnly,
        isWeakMasculine: partial.isWeakMasculine,
        isPlace: partial.isPlace,
    };
}

const HUND = item({ word: 'Hund', gender: 'm' });          // thing, masc
const FRAU = item({ word: 'Frau', gender: 'f', animacy: 'person' });
const KIND = item({ word: 'Kind', gender: 'n', animacy: 'person' });
const PARK = item({ word: 'Park', gender: 'm', isPlace: true }); // place, masc

const byId = (id: string): SentenceTemplate => {
    const t = TEMPLATES.find(t => t.id === id);
    if (!t) throw new Error(`no template ${id}`);
    return t;
};

describe('templates', () => {
    it('each frame has exactly one blank', () => {
        for (const t of TEMPLATES) {
            expect(t.frame.match(/___/g)?.length, t.id).toBe(1);
        }
    });
});

describe('buildRound', () => {
    it('computes the correct article per case for a masculine noun', () => {
        expect(buildRound(HUND, byId('akk-sehen')).answer).toBe('den');
        expect(buildRound(HUND, byId('dat-mit')).answer).toBe('dem');
        expect(buildRound(HUND, byId('nom-gross')).answer).toBe('der');
    });

    it('renders the noun visible with the article blanked', () => {
        const r = buildRound(HUND, byId('akk-sehen'));
        expect(r.promptText).toBe('Ich sehe ___ Hund.');
        expect(r.spokenText).toBe('Ich sehe den Hund.');
    });

    it('options always include the correct answer', () => {
        for (const t of TEMPLATES) {
            for (const noun of [HUND, FRAU, KIND]) {
                const r = buildRound(noun, t);
                expect(r.options, `${t.id}/${noun.word}`).toContain(r.answer);
            }
        }
    });
});

describe('hints', () => {
    it('every round has at least one hint', () => {
        for (const t of TEMPLATES) {
            const r = buildRound(HUND, t);
            expect(r.hints.length, t.id).toBeGreaterThan(0);
        }
    });

    it('case hints name the case but NEVER reveal the answer article', () => {
        // The whole point: a hint helps without spoiling. For every template ×
        // gender, no hint may contain the correct article as a standalone word.
        for (const t of TEMPLATES) {
            for (const noun of [HUND, FRAU, KIND]) {
                const r = buildRound(noun, t);
                for (const h of r.hints) {
                    const leaks = new RegExp(`\\b${r.answer}\\b`).test(h.text);
                    expect(leaks, `${t.id}/${noun.word} hint leaks "${r.answer}": ${h.text}`).toBe(false);
                }
            }
        }
    });

    it('names the governing case for non-Nominativ templates', () => {
        const ruleOf = (id: string, item = HUND) =>
            buildRound(item, byId(id)).hints.find(h => h.kind === 'rule')!.text;
        expect(ruleOf('dat-mit')).toMatch(/Dativ/);
        expect(ruleOf('akk-sehen')).toMatch(/Akkusativ/);
    });

    it('includes a gender hint that names the gender but not the article', () => {
        const g = buildRound(FRAU, byId('akk-sehen')).hints.find(h => h.kind === 'gender')!;
        expect(g.text).toMatch(/feminine/);
        expect(g.text).toContain('Frau');
        expect(g.text).not.toMatch(/\b(der|die|das)\b/);
    });
});

describe('matches / semantic constraints', () => {
    it('person-only templates reject things and accept people', () => {
        expect(matches(HUND, byId('dat-helfen'))).toBe(false);
        expect(matches(FRAU, byId('dat-helfen'))).toBe(true);
    });

    it('thing-only templates reject people', () => {
        expect(matches(FRAU, byId('akk-essen'))).toBe(false);
        expect(matches(HUND, byId('akk-essen'))).toBe(true);
    });

    it('place-only (Wechsel) templates require a place noun', () => {
        expect(matches(HUND, byId('wechsel-in-akk'))).toBe(false); // Hund is not a place
        expect(matches(PARK, byId('wechsel-in-akk'))).toBe(true);
    });
});

describe('two-way prepositions (Wechsel)', () => {
    it('motion frames take Akkusativ, location frames take Dativ', () => {
        // Park is masculine: Akk → den, Dativ → dem.
        expect(buildRound(PARK, byId('wechsel-in-akk')).answer).toBe('den'); // Ich gehe in den Park
        expect(buildRound(PARK, byId('wechsel-in-dat')).answer).toBe('dem'); // Ich bin in dem Park
    });

    it('renders the contrast in the prompt', () => {
        expect(buildRound(PARK, byId('wechsel-in-akk')).promptText).toBe('Ich gehe in ___ Park.');
        expect(buildRound(PARK, byId('wechsel-in-dat')).promptText).toBe('Ich bin in ___ Park.');
    });

    it('hint teaches Wohin/Wo, not just the case, and never leaks the answer', () => {
        const akk = buildRound(PARK, byId('wechsel-in-akk'));
        const dat = buildRound(PARK, byId('wechsel-in-dat'));
        const ruleAkk = akk.hints.find(h => h.kind === 'rule')!.text;
        const ruleDat = dat.hints.find(h => h.kind === 'rule')!.text;
        expect(ruleAkk).toMatch(/Wohin/);
        expect(ruleDat).toMatch(/Wo\?/);
        expect(ruleAkk).not.toMatch(/\b(den|dem)\b/);
        expect(ruleDat).not.toMatch(/\b(den|dem)\b/);
    });
});

describe('isEligible', () => {
    it('excludes plural-only nouns', () => {
        expect(isEligible(item({ word: 'Eltern', gender: 'm', pluralOnly: true }))).toBe(false);
        expect(isEligible(HUND)).toBe(true);
    });
});

describe('pickRound / generateRounds', () => {
    it('never puts a person into a thing-only template', () => {
        const pool = [HUND, FRAU, KIND];
        for (let i = 0; i < 200; i++) {
            const r = pickRound(pool);
            if (r && (r.template.id === 'akk-essen' || r.template.id === 'akk-kaufen')) {
                expect(r.item.animacy).toBe('thing');
            }
        }
    });

    it('returns null for an all-ineligible pool', () => {
        expect(pickRound([item({ word: 'Eltern', gender: 'm', pluralOnly: true })])).toBeNull();
    });

    it('generateRounds covers each eligible noun once', () => {
        const rounds = generateRounds([HUND, FRAU, KIND]);
        expect(rounds.length).toBe(3);
    });
});
