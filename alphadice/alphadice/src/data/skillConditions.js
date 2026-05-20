// === Skill condition system ===
//
// Skills declare ONE condition type that gates casting. The original system
// supported only `requireWord` (must form a valid English word from the
// whitelist). This module generalizes that to a small set of condition
// types so we can design skills that reward different play patterns:
//
//   • requireWord       : true             — valid English word (default)
//   • requireSameLetter : N (number)       — N or more dice with the same face
//   • requireVowels     : N                — N or more vowels (A/E/I/O/U)
//   • requireConsonants : N                — N or more consonants
//
// Each condition returns a result shape:
//   { ok: true }                       // condition met, skill castable
//   { ok: false, reason: "Korean text" } // explanation shown in UI hint
//
// The UI (SkillBar) and the store (castSkill) both call validateSkill()
// to stay consistent. Adding a new condition only requires extending
// CONDITION_VALIDATORS below.

import { isValidWord } from "./dictionary.js";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function countSameLetter(letters) {
  const counts = {};
  let max = 0;
  for (const c of letters) {
    counts[c] = (counts[c] || 0) + 1;
    if (counts[c] > max) max = counts[c];
  }
  return max;
}

function countVowels(letters) {
  let n = 0;
  for (const c of letters) if (VOWELS.has(c)) n += 1;
  return n;
}

function countConsonants(letters) {
  let n = 0;
  for (const c of letters) if (!VOWELS.has(c) && /[A-Z]/.test(c)) n += 1;
  return n;
}

// Each validator gets (skill, letters[], word). Word is the joined string,
// letters is the array of dice faces in order. Different conditions need
// different views of the input.
const CONDITION_VALIDATORS = {
  requireWord: (skill, _letters, word) => {
    if (isValidWord(word)) return { ok: true };
    return { ok: false, reason: "사전에 없음" };
  },

  requireSameLetter: (skill, letters) => {
    const needed = skill.requireSameLetter;
    const got = countSameLetter(letters);
    if (got >= needed) return { ok: true };
    return { ok: false, reason: `같은 글자 ${needed}개 (현재 ${got})` };
  },

  requireVowels: (skill, letters) => {
    const needed = skill.requireVowels;
    const got = countVowels(letters);
    if (got >= needed) return { ok: true };
    return { ok: false, reason: `모음 ${needed}개 (현재 ${got})` };
  },

  requireConsonants: (skill, letters) => {
    const needed = skill.requireConsonants;
    const got = countConsonants(letters);
    if (got >= needed) return { ok: true };
    return { ok: false, reason: `자음 ${needed}개 (현재 ${got})` };
  },
};

// Returns the active condition keyword on a skill, or null if none.
// Used by callers that want to render a different hint per condition.
export function getSkillConditionKey(skill) {
  if (!skill) return null;
  for (const key of Object.keys(CONDITION_VALIDATORS)) {
    if (skill[key] !== undefined && skill[key] !== false) return key;
  }
  return null;
}

// Public: validate that the assembled dice satisfy the skill's condition.
// Returns { ok, reason? }. Callers should also separately check the
// slot-count window (min ≤ length ≤ max); this only checks the gating
// condition, not the slot range.
export function validateSkillCondition(skill, dice) {
  if (!skill) return { ok: false, reason: "스킬 없음" };
  const letters = dice.map((d) => d.face);
  const word = letters.join("");
  for (const key of Object.keys(CONDITION_VALIDATORS)) {
    if (skill[key] !== undefined && skill[key] !== false) {
      return CONDITION_VALIDATORS[key](skill, letters, word);
    }
  }
  // No condition declared → always OK (e.g. a freebie skill).
  return { ok: true };
}

// Convenience: human-readable condition label for the skill card. Returns
// "영단어" / "같은 글자 3개" / "모음 3개" etc. Used as the secondary line
// on skill cards when the description doesn't already convey it.
export function describeSkillCondition(skill) {
  if (!skill) return "";
  if (skill.requireWord) return "영단어";
  if (skill.requireSameLetter) return `같은 글자 ${skill.requireSameLetter}개`;
  if (skill.requireVowels) return `모음 ${skill.requireVowels}개`;
  if (skill.requireConsonants) return `자음 ${skill.requireConsonants}개`;
  return "";
}
