// Chapter 1 — "Der Aufbruch" (The Departure). The main quest's first arc.
//
// One continuing adventure told across the book's first four grammar points, in
// TOC order: Genus (1.1) → Plural (1.2) → Kasus Akkusativ (1.3) → Kasus Dativ
// (1.4). The prose is PLAIN German — no blanks are marked. The parser finds the
// drillable spots for each topic; everything else is read as story.
//
// Authoring rules honoured here (see .claude/plans/chapter-authoring-engine.md):
//  - every blanked noun is a real dataset noun;
//  - the surface article is written in the natural, case-correct form (the parser
//    reads the case off it);
//  - nouns are written already-declined (weak-masculine "den Jungen");
//  - NO genitive constructions in the case chapters.

import type { RawChapter } from './index';

export const CH1_GENUS: RawChapter = {
    id: 'ch1-genus',
    title: 'Kapitel 1 · Der Aufbruch',
    intro: 'Ein Junge träumt von einem Abenteuer. Heute beginnt seine Reise — doch zuerst muss er die Welt beim Namen nennen.',
    topic: 'genus',
    lines: [
        'Am Morgen wacht der Junge auf.',
        'Vor dem Haus wartet der Hund.',
        'Im Korb liegt das Brot und daneben steht die Milch.',
        'Auf dem Tisch glänzt der Apfel.',
        'Die Katze schläft, und das Buch ist schon gepackt.',
        'Der Vater ruft, die Mutter winkt.',
        'Das Abenteuer beginnt!',
    ],
};

export const CH1_PLURAL: RawChapter = {
    id: 'ch1-plural',
    title: 'Kapitel 1 · Der Markt',
    intro: 'Der Weg führt über den Markt. Überall stapeln sich die Waren — und von allem gibt es viele.',
    topic: 'plural',
    lines: [
        'Auf dem Markt sieht der Junge viele Äpfel.',
        'Daneben liegen frische Tomaten und reife Bananen.',
        'Die Bäcker verkaufen warme Brote.',
        'Kinder rennen vorbei, und zwei Hunde bellen.',
        'In den Körben liegen bunte Bücher.',
        'Aus den Töpfen dampfen heiße Suppen.',
        'So viele Sachen — und die Reise hat kaum begonnen!',
    ],
};

export const CH1_AKKUSATIV: RawChapter = {
    id: 'ch1-akkusativ',
    title: 'Kapitel 1 · Der Einkauf',
    intro: 'Bevor er weiterzieht, braucht der Junge Vorräte. Was nimmt er mit? Alles, was er kauft, steht im Akkusativ.',
    topic: 'kasus-akk',
    lines: [
        'Der Junge kauft den Apfel und den Käse.',
        'Für den Fisch und für den Salat bezahlt er gern.',
        'Er nimmt den Reis und den Kuchen mit.',
        'Durch den Wein wird das Fest noch schöner.',
        'Am Stand grüßt er den Jungen von gestern.',
        'Ohne den Kaffee geht er nicht weiter.',
        'Jetzt hat er alles für die Reise.',
    ],
};

export const CH1_DATIV: RawChapter = {
    id: 'ch1-dativ',
    title: 'Kapitel 1 · Die Reise',
    intro: 'Endlich geht es los. Der Junge reist nicht allein — und wer ihn begleitet, steht im Dativ.',
    topic: 'kasus-dat',
    lines: [
        'Der Junge wandert mit dem Hund über die Felder.',
        'Am Mittag rastet er bei dem Vater eines Freundes.',
        'Dann fährt er mit der Mutter zu dem Café.',
        'Er hilft dem Mann und dankt der Tante.',
        'Von dem Kind bekommt er eine Karte.',
        'Bei dem Onkel und bei der Oma schläft er gut.',
        'Mit dem Bruder beginnt ein neues Abenteuer.',
    ],
};
