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
    };
}

const HUND = item({ word: 'Hund', gender: 'm' });          // thing, masc
const FRAU = item({ word: 'Frau', gender: 'f', animacy: 'person' });
const KIND = item({ word: 'Kind', gender: 'n', animacy: 'person' });

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

describe('matches / semantic constraints', () => {
    it('person-only templates reject things and accept people', () => {
        expect(matches(HUND, byId('dat-helfen'))).toBe(false);
        expect(matches(FRAU, byId('dat-helfen'))).toBe(true);
    });

    it('thing-only templates reject people', () => {
        expect(matches(FRAU, byId('akk-essen'))).toBe(false);
        expect(matches(HUND, byId('akk-essen'))).toBe(true);
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
