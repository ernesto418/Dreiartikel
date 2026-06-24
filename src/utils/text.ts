// Small string helpers shared across the pure-logic modules.

/** Capitalise the first character, leave the rest untouched. */
export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
