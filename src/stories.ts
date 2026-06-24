// Story Mode: the learner reads a short German letter sentence by sentence and
// fills each blank with the correct plural, using the 3-option selector. It is a
// narrative wrapper around the existing engine: each blank is ONE PracticeRound
// (built by reusing plurals.ts), and the surrounding text rides along as
// `storyContext` so the UI can render the "cumulative letter".
//
// Stored vs derived (the project's recurring rule): the letter TEXT and which
// word fills each blank are STORED here; each blank's answer, decoys, options,
// hint and Tipp are DERIVED by the plural machinery — never duplicated.

import { generateItems, type PracticeItem } from './data';
import { buildPluralRound, hasPlural, pluralForm } from './plurals';
import type { PracticeRound } from './round';

// ── Story data shape ────────────────────────────────────────────────────────

/** A run of a line: literal text, or a blank to be filled with `word`'s plural. */
export type Segment =
    | { kind: 'text'; text: string }
    | { kind: 'blank'; word: string };

/** A story is an ordered list of lines; each line is a list of segments. Lines
 *  are the reading unit (we read/reveal line by line). */
export interface Story {
    id: string;
    title: string;
    /** Which grammar the blanks drill. Only 'plural' is implemented; the field
     *  exists so a Dativ story can branch the blank-building later. */
    mode: 'plural';
    lines: Segment[][];
}

/** An answer-free view of one segment, for rendering the letter. Blanks carry
 *  their global index so the UI can mark them done / current / future and fill
 *  the answer once revealed. */
export interface StorySegmentView {
    kind: 'text' | 'blank';
    /** Plain text for `text` segments; '' for blanks. */
    text: string;
    /** 0-based index among ALL blanks in the story (blanks only). */
    blankIndex?: number;
    /** The correct fill for a blank (blanks only). The UI shows it only once the
     *  blank has been answered, so it's not a spoiler — it lets answered blanks
     *  render the real word ("Bücher") instead of a marker. */
    answer?: string;
}

/** The narrative frame a story round sits in. The `lines` view is shared by
 *  reference across all of a story's rounds; only `blankIndex`/`answer` differ. */
export interface StoryContext {
    storyId: string;
    title: string;
    /** The whole letter, answer-free, as view-lines. */
    lines: StorySegmentView[][];
    /** Which blank THIS round fills. */
    blankIndex: number;
    /** Total blanks N, for the end-of-story "X / N" tally. */
    blankCount: number;
    /** The correct fill for this blank (so the UI can show answered blanks). */
    answer: string;
}

// ── The first story: "Liebe Lisa" (plural) ──────────────────────────────────
// Every blank word is a real dataset noun with a known plural, so answers and
// decoys come straight from plurals.ts. stories.test.ts guards this.

const t = (text: string): Segment => ({ kind: 'text', text });
const b = (word: string): Segment => ({ kind: 'blank', word });

const LIEBE_LISA: Story = {
    id: 'liebe-lisa',
    title: 'Liebe Lisa',
    mode: 'plural',
    lines: [
        [t('Liebe Lisa, wie geht es dir?')],
        [t('Hier an der Uni ist viel los — wir lesen viele '), b('Buch'), t(' und lernen jeden Tag.')],
        [t('Nur um Max mache ich mir Gedanken.')],
        [t('Statt zu lernen sitzt er ständig in den '), b('Café'), t(' der Stadt.')],
        [t('Dort plaudert er mit anderen '), b('Kind'), t(' und seinen '), b('Freundin'), t('.')],
        [t('Abends macht er nur '), b('Foto'), t(' und tanzt in allen '), b('Disco'), t(' der Stadt.')],
        [t('Das kann doch nicht gut gehen! Ruf ihn mal an.')],
        [t('Alles Liebe, deine Elisabeth.')],
    ],
};

export const STORIES: Story[] = [LIEBE_LISA];

// ── Generation: each blank → one PracticeRound, with narrative context ───────

/** Flatten a story's lines into the view shared across its rounds, numbering
 *  blanks globally in reading order and resolving each blank's answer (shown by
 *  the UI only after that blank is answered, so it's not a spoiler). */
function buildView(
    story: Story,
    byWord: Map<string, PracticeItem>,
): { lines: StorySegmentView[][]; blankWords: string[] } {
    const blankWords: string[] = [];
    const lines: StorySegmentView[][] = story.lines.map(line =>
        line.map(seg => {
            if (seg.kind === 'text') return { kind: 'text', text: seg.text };
            const blankIndex = blankWords.length;
            blankWords.push(seg.word);
            const item = byWord.get(seg.word);
            const answer = item ? pluralForm(item) : seg.word;
            return { kind: 'blank', text: '', blankIndex, answer };
        }),
    );
    return { lines, blankWords };
}

/** The text shown/read up to (and excluding) the blank with global index
 *  `globalBlank` — the "lead-in". Earlier blanks on the same line are already
 *  answered, so they're filled with their resolved answer (not left as a gap).
 *  Operates on the view so it has those answers. */
function leadInBeforeBlank(viewLine: StorySegmentView[], globalBlank: number): string {
    let out = '';
    for (const seg of viewLine) {
        if (seg.kind === 'text') { out += seg.text; continue; }
        if (seg.blankIndex === globalBlank) break;     // reached our blank
        out += seg.answer ?? '';                       // an earlier blank: fill it
    }
    return out.replace(/\s+/g, ' ').trim();
}

/** The continuous read spoken AFTER a blank is answered: the rest of the current
 *  sentence (with this blank — and any already-passed blanks — filled), then the
 *  following text flowing into the next sentence, stopping right BEFORE the next
 *  unanswered blank. This is what makes the audio glide sentence-to-sentence.
 *
 *  Walks the answer-resolved view from just after `globalBlank` to just before
 *  `globalBlank + 1`, emitting text and filled answers along the way. */
function continuationAfterBlank(lines: StorySegmentView[][], globalBlank: number): string {
    // Concatenate raw (text runs already carry their own spacing; answers slot
    // in where a blank was), then collapse whitespace at the end.
    let out = '';
    let passedCurrent = false;
    const done = () => out.replace(/\s+/g, ' ').trim();

    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        for (const seg of line) {
            if (seg.kind === 'text') {
                if (passedCurrent) out += seg.text;
                continue;
            }
            const bi = seg.blankIndex!;
            if (bi < globalBlank) continue;          // already read in a prior round
            if (bi === globalBlank) {
                out += seg.answer ?? '';             // fill the just-answered blank
                passedCurrent = true;
                continue;
            }
            // bi > globalBlank: the NEXT blank — stop here (silence while choosing).
            return done();
        }
        // A line break between sentences reads as a brief pause.
        if (passedCurrent) out += ' ';
    }
    // No further blank: read to the end of the letter.
    return done();
}

/** Build the rounds for one story: one PracticeRound per blank, in reading
 *  order. Answer/options/hints/Tipp are reused from buildPluralRound; the prompt
 *  and audio are rewritten to the narrative, and storyContext is attached. */
export function buildStoryRounds(story: Story, pool: PracticeItem[]): PracticeRound[] {
    const byWord = new Map(pool.map(i => [i.word, i]));
    const { lines, blankWords } = buildView(story, byWord);
    const blankCount = blankWords.length;

    const rounds: PracticeRound[] = [];
    let globalBlank = 0;

    for (let li = 0; li < story.lines.length; li++) {
        const line = story.lines[li];

        for (const seg of line) {
            if (seg.kind === 'text') continue;

            const item = byWord.get(seg.word);
            if (!item) {
                // A blank word missing from the pool is a data bug; skip it so the
                // story still plays. stories.test.ts catches this at build time.
                globalBlank++;
                continue;
            }

            const base = buildPluralRound(item);
            const answer = base.answer;

            // Prompt: the line up to this blank (earlier blanks on the line shown
            // filled), with this slot as ___.
            const lead = leadInBeforeBlank(lines[li], globalBlank);
            const promptText = `${lead} ___`.trim();

            const context: StoryContext = {
                storyId: story.id,
                title: story.title,
                lines,
                blankIndex: globalBlank,
                blankCount,
                answer,
            };

            rounds.push({
                ...base,
                promptText,
                // Audio (continuous): on show, speak the lead-in up to the blank
                // (handled in toRound from promptText). On answer, speak the rest
                // of THIS sentence with the blank filled, then glide into the
                // following text up to the NEXT blank — so the read flows
                // sentence-to-sentence instead of stopping at each blank.
                spokenText: continuationAfterBlank(lines, globalBlank),
                speakOnShowSafe: true,
                storyContext: context,
            });

            globalBlank++;
        }
    }

    return rounds;
}

/** Story-mode RoundGenerator. A story is a fixed text, so it isn't narrowed by
 *  the noun-pool filter the way other modes are: we resolve blank words from the
 *  full item set (unioned with whatever `pool` was passed) so the story's plurals
 *  are always available regardless of the active filter. */
export function generateStoryRounds(pool: PracticeItem[]): PracticeRound[] {
    const byWord = new Map<string, PracticeItem>();
    for (const item of [...generateItems(), ...pool]) {
        if (hasPlural(item)) byWord.set(item.word, item);
    }
    const items = [...byWord.values()];
    return STORIES.flatMap(story => buildStoryRounds(story, items));
}
