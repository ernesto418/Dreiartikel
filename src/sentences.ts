// Single-case sentence practice: slot a noun into a sentence frame and ask the
// learner for the article it must take in the case the frame governs.

import { articleFor, optionsForCase, CASE_LABELS, type Case } from './declension';
import { getTipp } from './rules';
import { shuffle, type Animacy, type PracticeItem } from './data';

export interface SentenceTemplate {
    id: string;
    /** Surface text with a single `___` slot where [article noun] goes. */
    frame: string;
    /** The case the slot noun must take. */
    case: Case;
    /** Semantic constraint on the noun that can fill the slot. */
    requires: Animacy | 'any';
    /** The trigger that forces this case, phrased to slot into a tip:
     *  "<trigger> takes the Akkusativ". e.g. "the verb 'sehen'". */
    trigger: string;
}

export const TEMPLATES: SentenceTemplate[] = [
    // ── Akkusativ (transitive verb / akkusativ preposition) ──
    { id: 'akk-sehen', frame: 'Ich sehe ___.', case: 'akk', requires: 'any', trigger: "the direct object of 'sehen'" },
    { id: 'akk-kaufen', frame: 'Ich kaufe ___.', case: 'akk', requires: 'thing', trigger: "the direct object of 'kaufen'" },
    { id: 'akk-essen', frame: 'Ich esse ___.', case: 'akk', requires: 'thing', trigger: "the direct object of 'essen'" },
    { id: 'akk-fuer', frame: 'Das ist für ___.', case: 'akk', requires: 'any', trigger: "the preposition 'für'" },

    // ── Dativ (dative verb / dative preposition) ──
    { id: 'dat-helfen', frame: 'Ich helfe ___.', case: 'dat', requires: 'person', trigger: "the dative verb 'helfen'" },
    { id: 'dat-danken', frame: 'Ich danke ___.', case: 'dat', requires: 'person', trigger: "the dative verb 'danken'" },
    { id: 'dat-mit', frame: 'Ich fahre mit ___.', case: 'dat', requires: 'any', trigger: "the preposition 'mit'" },
    { id: 'dat-zu', frame: 'Ich gehe zu ___.', case: 'dat', requires: 'any', trigger: "the preposition 'zu'" },

    // ── Nominativ (subject) ──
    { id: 'nom-gross', frame: '___ ist groß.', case: 'nom', requires: 'any', trigger: "the subject" },
];

export interface CaseRound {
    item: PracticeItem;
    template: SentenceTemplate;
    /** Sentence with the noun shown and the article blanked: "Ich sehe ___ Hund." */
    promptText: string;
    /** Full sentence read aloud, with the correct article: "Ich sehe den Hund." */
    spokenText: string;
    answer: string;        // the correct article, e.g. 'den'
    options: string[];     // distinct article choices for this case (shuffled)
    /** Explanation shown after answering. */
    tipp: string;
}

/** Educational explanation for a round. Nominativ leans on the gender rule
 *  (case is a no-op there); other cases show the trigger → form change. */
function buildTipp(item: PracticeItem, template: SentenceTemplate, answer: string): string {
    if (template.case === 'nom') {
        // The article is just the dictionary article — explain the gender.
        return getTipp(item.word, item.gender);
    }

    const base = articleFor(item.gender, 'nom', 'sg'); // dictionary article
    const caseName = CASE_LABELS[template.case];
    const change = base === answer
        ? `"${base} ${item.word}" stays "${answer} ${item.word}" — ${caseName} doesn't change this article.`
        : `"${base} ${item.word}" becomes "${answer} ${item.word}".`;
    return `${template.trigger} takes the ${caseName}: ${change}`;
}

/** Build a single case round from an item + template. */
export function buildRound(item: PracticeItem, template: SentenceTemplate): CaseRound {
    const answer = articleFor(item.gender, template.case, 'sg');
    const options = shuffle(optionsForCase(template.case, 'sg'));
    const promptText = template.frame.replace('___', `___ ${item.word}`);
    const spokenText = template.frame.replace('___', `${answer} ${item.word}`);
    const tipp = buildTipp(item, template, answer);
    return { item, template, promptText, spokenText, answer, options, tipp };
}

/** Is this noun usable in sentence mode at all? (Phase 1: singular only.) */
export function isEligible(item: PracticeItem): boolean {
    return !item.pluralOnly;
}

/** Does a noun satisfy a template's semantic constraint? */
export function matches(item: PracticeItem, t: SentenceTemplate): boolean {
    return t.requires === 'any' || t.requires === item.animacy;
}

function randomOf<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick one random (template, noun) round from a noun pool, or null if the pool
 *  has no eligible nouns. Template-first, then a noun that satisfies it. */
export function pickRound(pool: PracticeItem[]): CaseRound | null {
    const eligible = pool.filter(isEligible);
    if (eligible.length === 0) return null;

    // Only consider templates that at least one eligible noun can satisfy, so a
    // person-only template never deadlocks a pool with no people.
    const usableTemplates = TEMPLATES.filter(t => eligible.some(i => matches(i, t)));
    if (usableTemplates.length === 0) return null;

    const template = randomOf(usableTemplates);
    const candidates = eligible.filter(i => matches(i, template));
    return buildRound(randomOf(candidates), template);
}

/** Build a shuffled list of rounds covering the eligible pool once. */
export function generateRounds(pool: PracticeItem[]): CaseRound[] {
    const eligible = shuffle(pool.filter(isEligible));
    return eligible
        .map(item => {
            const usable = TEMPLATES.filter(t => matches(item, t));
            return usable.length ? buildRound(item, randomOf(usable)) : null;
        })
        .filter((r): r is CaseRound => r !== null);
}
