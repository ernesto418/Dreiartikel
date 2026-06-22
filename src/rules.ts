// Single source of truth for German gender (der/die/das) suffix & prefix rules.
//
// Both the "By Rule" filter (does a strong pattern apply?) and the Tipp engine
// (explain *why*) consume this list, so the two can never drift apart.

import { articleFor } from './declension';

export type Gender = 'm' | 'f' | 'n';
export type Article = 'der' | 'die' | 'das';

/** Canonical article for a noun's gender in the Nominativ singular.
 *
 *  This is the Nominativ-singular special case of the general case engine in
 *  declension.ts — it delegates to `articleFor` so there is one source of truth
 *  for article morphology. */
export function articleForGender(gender: Gender): Article {
    return articleFor(gender, 'nom', 'sg') as Article;
}

export function genderForArticle(article: Article): Gender {
    switch (article) {
        case 'der': return 'm';
        case 'die': return 'f';
        case 'das': return 'n';
    }
}

interface GenderRule {
    /** 'suffix' matches the end of the word, 'prefix' the start. */
    kind: 'suffix' | 'prefix';
    pattern: string;
    gender: Gender;
    /** Human-readable explanation shown in the Tipp box. */
    explain: (pattern: string) => string;
}

// Ordered by strength: the first matching rule wins. Strong, near-exceptionless
// suffixes (e.g. -chen) come before weak heuristics (e.g. -e).
const RULES: GenderRule[] = [
    // ── Feminine ──────────────────────────────────────────────────────
    { kind: 'suffix', pattern: 'ung', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'heit', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'keit', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'schaft', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'tion', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'tät', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'ik', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'ei', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'ie', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'ur', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },
    { kind: 'suffix', pattern: 'enz', gender: 'f', explain: s => `Nouns ending in -${s} are feminine.` },

    // ── Neuter ────────────────────────────────────────────────────────
    { kind: 'suffix', pattern: 'chen', gender: 'n', explain: s => `Diminutives ending in -${s} are always neuter, regardless of the base word.` },
    { kind: 'suffix', pattern: 'lein', gender: 'n', explain: s => `Diminutives ending in -${s} are always neuter, regardless of the base word.` },
    { kind: 'suffix', pattern: 'ment', gender: 'n', explain: s => `Nouns ending in -${s} are typically neuter.` },
    { kind: 'suffix', pattern: 'um', gender: 'n', explain: s => `Nouns ending in -${s} are typically neuter.` },
    { kind: 'suffix', pattern: 'ma', gender: 'n', explain: s => `Nouns ending in -${s} are typically neuter.` },

    // ── Masculine ─────────────────────────────────────────────────────
    { kind: 'suffix', pattern: 'ling', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'ismus', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'or', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'ig', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'ich', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'ant', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'ast', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },
    { kind: 'suffix', pattern: 'us', gender: 'm', explain: s => `Nouns ending in -${s} are typically masculine.` },

    // ── Weak heuristics (apply only if no strong rule above matched) ───
    { kind: 'prefix', pattern: 'ge', gender: 'n', explain: () => `Many nouns starting with the prefix Ge- are neuter.` },
    { kind: 'suffix', pattern: 'e', gender: 'f', explain: () => `Nouns ending in -e are very often feminine (about 90%).` },
    { kind: 'suffix', pattern: 'en', gender: 'm', explain: s => `Nouns ending in -${s} are often masculine.` },
    { kind: 'suffix', pattern: 'er', gender: 'm', explain: s => `Nouns ending in -${s} are often masculine.` },
];

/** The first rule whose pattern matches the word, or null if none apply. */
function matchRule(word: string): GenderRule | null {
    const lw = word.toLowerCase();
    for (const rule of RULES) {
        const matches = rule.kind === 'suffix' ? lw.endsWith(rule.pattern) : lw.startsWith(rule.pattern);
        if (matches) return rule;
    }
    return null;
}

/** Does the word follow a strong suffix/prefix rule that predicts its gender? */
export function hasRule(word: string, gender: Gender): boolean {
    const rule = matchRule(word);
    return rule !== null && rule.gender === gender;
}

/** A short explanation of why the word has its gender, for the Tipp box. */
export function getTipp(word: string, gender: Gender): string {
    const rule = matchRule(word);
    if (rule && rule.gender === gender) {
        return rule.explain(rule.pattern);
    }

    const label = gender === 'm' ? 'masculine' : gender === 'f' ? 'feminine' : 'neuter';
    return `This one is best memorized — no strong pattern applies to this ${label} noun.`;
}
