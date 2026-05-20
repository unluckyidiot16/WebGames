// === Dice ===
// Each character has 7 dice templates (6 sides each).
// Rolling a die = pick random face. State stores: { face, locked, dieIndex }

export function rollDice(diceTemplates) {
  return diceTemplates.map((sides, i) => ({
    dieIndex: i,
    face: sides[Math.floor(Math.random() * sides.length)],
    locked: false,
    used: false,
    skillSlotId: null,       // if non-null, this die is assigned to a skill slot
  }));
}

export function rerollUnlocked(currentDice, diceTemplates) {
  return currentDice.map((die, i) => {
    if (die.locked || die.used) return die;
    const sides = diceTemplates[i];
    return {
      ...die,
      face: sides[Math.floor(Math.random() * sides.length)],
    };
  });
}

// === Damage Formula ===
// Non-linear curve — strongly rewards longer words.
// Rare letter bonus stacks on top.

const DAMAGE_BY_LENGTH = {
  3: 6,
  4: 10,
  5: 16,
  6: 25,
  7: 40,
  8: 60,
  9: 85,
  10: 115,
};

const RARE_LETTER_BONUS = {
  J: 3,
  Q: 5,
  X: 5,
  Z: 4,
  K: 2,
  V: 2,
};

export function computeDamage(word) {
  if (!word || word.length < 3) return { base: 0, bonus: 0, total: 0, rareLetters: [] };

  const len = Math.min(word.length, 10);
  const base = DAMAGE_BY_LENGTH[len] || DAMAGE_BY_LENGTH[10];

  let bonus = 0;
  const rareLetters = [];
  for (const ch of word.toUpperCase()) {
    if (RARE_LETTER_BONUS[ch]) {
      bonus += RARE_LETTER_BONUS[ch];
      rareLetters.push(ch);
    }
  }

  return {
    base,
    bonus,
    total: base + bonus,
    rareLetters,
  };
}

// Lookup of base damage for a given length (used by skill-effect resolution).
export function baseDamageByLength(len) {
  if (len < 3) return 0;
  const clamped = Math.min(len, 10);
  return DAMAGE_BY_LENGTH[clamped] || DAMAGE_BY_LENGTH[10];
}

// === Animation tier by word length ===
// Used to pick which combat animation to play.

export function attackTierByLength(len) {
  if (len <= 4) return "basic";
  if (len <= 5) return "strong";
  return "special"; // 6+ letters
}
