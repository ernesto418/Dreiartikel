// Single-case sentence practice: slot a noun into a sentence frame and ask the
// learner for the article it must take in the case the frame governs.

import { articleFor, optionsForCase, declineNoun, CASE_LABELS, type Case } from './declension';
import { getTipp } from './rules';
import { genderHint, type Hint } from './hints';
import { type Animacy, type PracticeItem } from './data';
import { shuffle, randomOf } from './utils/random';
import { capitalize } from './utils/text';
import type { PracticeRound } from './round';

/** What kind of noun can fill a template's slot. */
export type SlotConstraint = Animacy | 'place' | 'any';

export interface SentenceTemplate {
    id: string;
    /** Surface text with a single `___` slot where [article noun] goes. */
    frame: string;
    /** The case the slot noun must take. */
    case: Case;
    /** Semantic constraint on the noun that can fill the slot. */
    requires: SlotConstraint;
    /** The trigger that forces this case, phrased to slot into a tip:
     *  "<trigger> takes the Akkusativ". e.g. "the verb 'sehen'". */
    trigger: string;
    /** For two-way (Wechsel) prepositions: whether the frame expresses motion
     *  toward a goal ('wohin' → Akkusativ) or static location ('wo' → Dativ).
     *  Drives the motion-vs-location reasoning in hints. */
    motion?: 'wohin' | 'wo';
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

    // ── Two-way prepositions (Wechselpräpositionen) ──────────────────
    // Same preposition; the verb decides the case. Motion toward a goal
    // (Wohin?) → Akkusativ; static location (Wo?) → Dativ.
    { id: 'wechsel-in-akk', frame: 'Ich gehe in ___.', case: 'akk', requires: 'place', trigger: "'in' with a motion verb (Wohin?)", motion: 'wohin' },
    { id: 'wechsel-in-dat', frame: 'Ich bin in ___.', case: 'dat', requires: 'place', trigger: "'in' with a location verb (Wo?)", motion: 'wo' },
    { id: 'wechsel-auf-akk', frame: 'Ich gehe auf ___.', case: 'akk', requires: 'place', trigger: "'auf' with a motion verb (Wohin?)", motion: 'wohin' },
    { id: 'wechsel-auf-dat', frame: 'Ich bin auf ___.', case: 'dat', requires: 'place', trigger: "'auf' with a location verb (Wo?)", motion: 'wo' },
    { id: 'wechsel-vor-akk', frame: 'Ich gehe vor ___.', case: 'akk', requires: 'place', trigger: "'vor' with a motion verb (Wohin?)", motion: 'wohin' },
    { id: 'wechsel-vor-dat', frame: 'Ich stehe vor ___.', case: 'dat', requires: 'place', trigger: "'vor' with a location verb (Wo?)", motion: 'wo' },
];

/** A case round is a `PracticeRound` whose answer is the article a noun takes in
 *  the case the template governs. Speaking the prompt up front would reveal that
 *  article, so `speakOnShowSafe` is always false. */
export interface CaseRound extends PracticeRound {
    template: SentenceTemplate;
}

// The case-question test (Hueber 1.3 §1a): you identify a noun's case by the
// question it answers. Nominativ asks Wer?/Was?, Akkusativ Wen?/Was?, Dativ
// always Wem?. Persons take the wer/wen/wem forms; things always take Was? (only
// Dativ-thing falls back to Wem?, since Was? has no dative). This is the method
// the book leads with, so it goes in BOTH the hint and the error explanation.
const CASE_QUESTION: Record<Case, { person: string; thing: string }> = {
    nom: { person: 'Wer?', thing: 'Was?' },
    akk: { person: 'Wen?', thing: 'Was?' },
    dat: { person: 'Wem?', thing: 'Wem?' },
    gen: { person: 'Wessen?', thing: 'Wessen?' },
};

/** The question word that identifies this case for this noun, e.g. a person in
 *  the Akkusativ answers "Wen?", a thing answers "Was?". */
function caseQuestion(caseName: Case, animacy: Animacy): string {
    const q = CASE_QUESTION[caseName];
    return animacy === 'person' ? q.person : q.thing;
}

/** Hints for a case round: the rule trigger (names the case, not the article)
 *  plus the noun's gender. e.g. "The preposition 'zu' takes the Dativ. (Ask
 *  Wem?)" and "Kirche is feminine." For Nominativ, where case is a no-op, the
 *  rule hint nudges toward gender instead. The Wer?/Wen?/Wem? question test
 *  (Hueber 1.3) is appended so the learner learns *how* to spot the case. */
function buildHints(item: PracticeItem, template: SentenceTemplate): Hint[] {
    const question = caseQuestion(template.case, item.animacy);
    let ruleText: string;
    if (template.motion) {
        // Two-way preposition: teach the decision, not just the case.
        ruleText = template.motion === 'wohin'
            ? `Motion toward a goal — ask “Wohin?” → Akkusativ. (Ask “${question}”)`
            : `Static location — ask “Wo?” → Dativ. (Ask “${question}”)`;
    } else if (template.case === 'nom') {
        ruleText = `The subject is in the Nominativ (ask “${question}”) — think about the noun’s gender.`;
    } else {
        ruleText = `${capitalize(template.trigger)} takes the ${CASE_LABELS[template.case]} — ask “${question}”.`;
    }
    return [{ kind: 'rule', text: ruleText }, genderHint(item.word, item.gender)];
}

/** Educational explanation for a round. Nominativ leans on the gender rule
 *  (case is a no-op there); other cases show the trigger → form change. */
function buildTipp(item: PracticeItem, template: SentenceTemplate, answer: string): string {
    if (template.case === 'nom') {
        // The article is just the dictionary article — explain the gender.
        return getTipp(item.word, item.gender);
    }

    const weak = !!item.isWeakMasculine;
    const baseArticle = articleFor(item.gender, 'nom', 'sg');
    const basePhrase = `${baseArticle} ${item.word}`;                          // der Junge
    const resultPhrase = `${answer} ${declineNoun(item.word, weak, template.case)}`; // den Jungen
    const caseName = CASE_LABELS[template.case];
    const question = caseQuestion(template.case, item.animacy);
    const change = basePhrase === resultPhrase
        ? `"${basePhrase}" stays "${resultPhrase}" — ${caseName} doesn't change it.`
        : `"${basePhrase}" becomes "${resultPhrase}".`;

    // Two-way prepositions: lead with the motion-vs-location reasoning.
    const lead = template.motion
        ? (template.motion === 'wohin'
            ? `Motion (Wohin?) → ${caseName}`
            : `Location (Wo?) → ${caseName}`)
        : `${capitalize(template.trigger)} takes the ${caseName}`;
    // The question test (Hueber 1.3): show what to ask to find the case yourself.
    return `${lead}. Ask “${question}” → ${caseName}: ${change}`;
}

/** Build a single case round from an item + template. */
export function buildRound(item: PracticeItem, template: SentenceTemplate): CaseRound {
    const answer = articleFor(item.gender, template.case, 'sg');
    const options = shuffle(optionsForCase(template.case, 'sg'));
    const noun = declineNoun(item.word, !!item.isWeakMasculine, template.case, 'sg');
    const promptText = template.frame.replace('___', `___ ${noun}`);
    const spokenText = template.frame.replace('___', `${answer} ${noun}`);
    const tipp = buildTipp(item, template, answer);
    const hints = buildHints(item, template);
    // Speaking the prompt would reveal the article, so it's never safe on show.
    return { item, template, promptText, spokenText, speakOnShowSafe: false, answer, options, tipp, hints };
}

// ── Detect mode (Hueber 1.4) ─────────────────────────────────────────────
// The inverse exercise: instead of producing the article for a known case, the
// learner is shown a COMPLETE correct sentence with one phrase highlighted and
// must identify its case (Nominativ/Akkusativ/Dativ) using the Wer?/Wen?/Wem?
// question test. The article is already on screen — it's the clue, not the gap.

/** Fixed Nom/Akk/Dat option order — kept stable so detect mode has the same
 *  muscle-memory positions as article mode (← Nominativ, ↓ Akkusativ, → Dativ). */
export const DETECT_OPTIONS: string[] = [CASE_LABELS.nom, CASE_LABELS.akk, CASE_LABELS.dat];

/** Build a detect round: a finished sentence with the target phrase highlighted,
 *  the learner picks which case that phrase is in. Reuses the same templates and
 *  the Wer?/Wen?/Wem? hints as produce mode — only the question is inverted. */
export function buildDetectRound(item: PracticeItem, template: SentenceTemplate): CaseRound {
    const article = articleFor(item.gender, template.case, 'sg');
    const noun = declineNoun(item.word, !!item.isWeakMasculine, template.case, 'sg');
    const phrase = `${article} ${noun}`;                         // "der Frau", "den Hund"
    const sentence = template.frame.replace('___', phrase);     // "Ich helfe der Frau."

    const answer = CASE_LABELS[template.case];                  // "Dativ"
    const hints = buildHints(item, template);
    const tipp = buildTipp(item, template, article);

    // The full sentence is shown (article is the clue), so speaking it is safe.
    return {
        item, template,
        promptText: sentence,
        spokenText: sentence,
        speakOnShowSafe: true,
        answer,
        options: DETECT_OPTIONS,                                // fixed positions
        tipp,
        hints,
        highlight: phrase,                                      // what to mark on screen
    };
}

/** Build a shuffled list of detect rounds, one per eligible noun. `caseFilter`
 *  narrows to a single case, same as produce mode. */
export function generateDetectRounds(pool: PracticeItem[], caseFilter: CaseFilter = 'all'): CaseRound[] {
    const templates = templatesForCase(caseFilter);
    const eligible = shuffle(pool.filter(isEligible));
    return eligible
        .map(item => {
            const usable = templates.filter(t => matches(item, t));
            return usable.length ? buildDetectRound(item, randomOf(usable)) : null;
        })
        .filter((r): r is CaseRound => r !== null);
}

/** Is this noun usable in sentence mode at all? (Phase 1: singular only.) */
export function isEligible(item: PracticeItem): boolean {
    return !item.pluralOnly;
}

/** Does a noun satisfy a template's semantic constraint? */
export function matches(item: PracticeItem, t: SentenceTemplate): boolean {
    if (t.requires === 'any') return true;
    if (t.requires === 'place') return !!item.isPlace;
    return t.requires === item.animacy;
}

/** Which case(s) to drill. `'all'` mixes every case (the default); a single
 *  case restricts rounds to templates governing that case — so a learner can
 *  study only Akkusativ, only Dativ, etc. (Nominativ included for completeness.) */
export type CaseFilter = 'all' | Case;

/** Templates governing the chosen case (all of them when `caseFilter` is 'all'). */
function templatesForCase(caseFilter: CaseFilter): SentenceTemplate[] {
    return caseFilter === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.case === caseFilter);
}

/** Pick one random (template, noun) round from a noun pool, or null if the pool
 *  has no eligible nouns. Template-first, then a noun that satisfies it.
 *  `caseFilter` narrows to a single case (e.g. study only Dativ). */
export function pickRound(pool: PracticeItem[], caseFilter: CaseFilter = 'all'): CaseRound | null {
    const eligible = pool.filter(isEligible);
    if (eligible.length === 0) return null;

    // Only consider templates for the chosen case that at least one eligible noun
    // can satisfy, so a person-only template never deadlocks a pool with no people.
    const usableTemplates = templatesForCase(caseFilter).filter(t => eligible.some(i => matches(i, t)));
    if (usableTemplates.length === 0) return null;

    const template = randomOf(usableTemplates);
    const candidates = eligible.filter(i => matches(i, template));
    return buildRound(randomOf(candidates), template);
}

/** Build a shuffled list of rounds covering the eligible pool once. `caseFilter`
 *  narrows to a single case; a noun that fits no template for that case (e.g. a
 *  thing under a person-only Dativ template) is dropped. */
export function generateRounds(pool: PracticeItem[], caseFilter: CaseFilter = 'all'): CaseRound[] {
    const templates = templatesForCase(caseFilter);
    const eligible = shuffle(pool.filter(isEligible));
    return eligible
        .map(item => {
            const usable = templates.filter(t => matches(item, t));
            return usable.length ? buildRound(item, randomOf(usable)) : null;
        })
        .filter((r): r is CaseRound => r !== null);
}
