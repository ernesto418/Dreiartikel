// The app's single source of randomness. Both helpers use Math.random, so they
// are tested by invariants over many iterations, never exact output.

/** Pick a uniformly random element of a non-empty array. */
export function randomOf<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// `shuffle` lives in data.ts (its first consumer); re-export it here so callers
// have one place to reach for randomness.
export { shuffle } from '../data';
