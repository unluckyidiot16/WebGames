// === Player profile (persistent across runs) ===
//
// Stored in localStorage under a single key so all profile data round-trips
// in one JSON read/write. The profile tracks total victories and per-class
// stats, which gates character selection via a simple sequential unlock
// progression.
//
// Unlock progression (totalVictories → newly unlocked):
//   0 wins  → knight only
//   1 win   → + rogue
//   2 wins  → + mage
//   3 wins  → + ranger
//   4 wins  → + druid
//   5 wins  → + engineer
//
// This is intentionally linear so progress is legible. Future work could
// branch (e.g. clear with mage to unlock druid) but linear is fine for MVP.

const KEY = "alphadice.profile.v1";

const DEFAULT_PROFILE = {
  totalVictories: 0,
  // characterId → { wins: 0, attempts: 0, lastPlayed: timestamp }
  charactersUsed: {},
};

export const CHARACTER_UNLOCK_ORDER = [
  "knight",      // unlocked at 0 wins (default starter)
  "rogue",       // unlocked after 1 win
  "mage",        // unlocked after 2 wins
  "barbarian",   // unlocked after 3 wins (final unlock for MVP)
];

// Load — wraps localStorage in a try/catch (private-mode browsers, SSR, etc).
export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      charactersUsed: { ...DEFAULT_PROFILE.charactersUsed, ...(parsed.charactersUsed || {}) },
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Quota exceeded / private mode — swallow; progression simply won't
    // persist this session.
  }
}

// Bump victory counts and persist. Returns the updated profile so callers
// can read the new state without doing another load.
export function recordVictory(characterId) {
  const p = loadProfile();
  p.totalVictories = (p.totalVictories || 0) + 1;
  if (!p.charactersUsed[characterId]) {
    p.charactersUsed[characterId] = { wins: 0, attempts: 0, lastPlayed: 0 };
  }
  p.charactersUsed[characterId].wins += 1;
  p.charactersUsed[characterId].lastPlayed = Date.now();
  saveProfile(p);
  return p;
}

// Bump attempt counts. Called when the player begins a run with a class.
export function recordAttempt(characterId) {
  const p = loadProfile();
  if (!p.charactersUsed[characterId]) {
    p.charactersUsed[characterId] = { wins: 0, attempts: 0, lastPlayed: 0 };
  }
  p.charactersUsed[characterId].attempts += 1;
  p.charactersUsed[characterId].lastPlayed = Date.now();
  saveProfile(p);
  return p;
}

// Sequential unlock: the Nth character in CHARACTER_UNLOCK_ORDER is
// unlocked after the player has won N times (so the first character is
// always unlocked at 0 wins).
export function isCharacterUnlocked(characterId, profile) {
  const p = profile || loadProfile();
  const idx = CHARACTER_UNLOCK_ORDER.indexOf(characterId);
  if (idx < 0) return true; // unknown id — fail open
  return (p.totalVictories || 0) >= idx;
}

// Wins needed before a given character becomes available. Returns 0 if
// already unlocked.
export function winsNeededToUnlock(characterId, profile) {
  const p = profile || loadProfile();
  const idx = CHARACTER_UNLOCK_ORDER.indexOf(characterId);
  if (idx < 0) return 0;
  return Math.max(0, idx - (p.totalVictories || 0));
}

// Convenience for dev/QA — wipes the profile so unlock progression
// can be retested from scratch. Not wired to any UI; call from devtools.
export function _resetProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
