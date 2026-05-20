// === Reward dice pool ===
//
// After clearing a minion-tier encounter, the player is offered a choice
// of 3 dice to add to their deck. The dice listed below are categorized by
// theme so the reward UI can pick appropriate options for each class /
// situation.
//
// Each entry has:
//   id    : stable unique slug
//   name  : Korean display name
//   desc  : short description (what words it enables)
//   sides : 6 letters (duplicates allowed)
//   tier  : 1 (common) / 2 (uncommon) / 3 (rare)
//   tags  : array of strings — used for filtering by class affinity

export const REWARD_DICE = [
  // === Common (tier 1) ===
  {
    id: "vowel_basic",
    name: "모음 다이스",
    desc: "기본 모음. 어떤 단어든 잘 어울림.",
    sides: ["A", "E", "I", "O", "U", "Y"],
    tier: 1,
    tags: ["any", "vowel"],
  },
  {
    id: "core_consonant",
    name: "기본 자음",
    desc: "가장 흔한 자음 6종.",
    sides: ["S", "T", "N", "R", "L", "D"],
    tier: 1,
    tags: ["any"],
  },
  {
    id: "s_double",
    name: "S 더블",
    desc: "S 면 2개. 복수형/STAR/STAB 등.",
    sides: ["S", "S", "T", "N", "R", "L"],
    tier: 1,
    tags: ["any"],
  },
  {
    id: "t_double",
    name: "T 더블",
    desc: "T 면 2개. STAB/STAR/PUTT.",
    sides: ["T", "T", "A", "E", "S", "R"],
    tier: 1,
    tags: ["any"],
  },

  // === Themed (tier 2) ===
  {
    id: "blade",
    name: "검의 다이스",
    desc: "BLADE/STAB/SWORD에 적합.",
    sides: ["B", "L", "A", "D", "E", "S"],
    tier: 2,
    tags: ["knight", "rogue", "engineer"],
  },
  {
    id: "stealth",
    name: "잠행의 다이스",
    desc: "DASH/SNEAK/HIDE 등에 적합.",
    sides: ["D", "S", "H", "K", "N", "E"],
    tier: 2,
    tags: ["rogue"],
  },
  {
    id: "arcana",
    name: "비전의 다이스",
    desc: "SPELL/MAGIC/ARCANE 류.",
    sides: ["S", "P", "L", "C", "M", "G"],
    tier: 2,
    tags: ["mage"],
  },
  {
    id: "wind",
    name: "바람의 다이스",
    desc: "WIND/ARROW/HUNT 류에 적합.",
    sides: ["W", "H", "N", "R", "A", "I"],
    tier: 2,
    tags: ["ranger", "druid"],
  },
  {
    id: "earth",
    name: "대지의 다이스",
    desc: "ROOT/EARTH/MOSS 등.",
    sides: ["R", "T", "H", "E", "M", "O"],
    tier: 2,
    tags: ["druid"],
  },
  {
    id: "forge",
    name: "단조의 다이스",
    desc: "FORGE/BOLT/GEAR 등.",
    sides: ["F", "G", "R", "O", "B", "L"],
    tier: 2,
    tags: ["engineer", "knight"],
  },

  // === Rare (tier 3) ===
  {
    id: "rare_letters",
    name: "희귀 글자",
    desc: "J/Q/X/Z 보너스 노리는 도박판.",
    sides: ["J", "Q", "X", "Z", "K", "V"],
    tier: 3,
    tags: ["mage", "any"],
  },
  {
    id: "vowel_rich",
    name: "긴 단어용 모음",
    desc: "AEIOU + Y. 장문 빌드에 유리.",
    sides: ["A", "E", "I", "O", "U", "A"],
    tier: 3,
    tags: ["mage", "any"],
  },
  {
    id: "wild",
    name: "야생 다이스",
    desc: "균형 6글자. 보편적.",
    sides: ["E", "A", "N", "T", "R", "L"],
    tier: 3,
    tags: ["any"],
  },
];

// Helper: pick 3 random reward dice (no duplicates), preferring class-matching
// ones but always including at least one "any"-class option.
export function pickRewardDiceChoices(characterId, count = 3, rng = Math.random) {
  // Class-affinity pool first, then fall back to anything tagged "any".
  const classPool = REWARD_DICE.filter(
    (d) => d.tags.includes(characterId) || d.tags.includes("any")
  );
  // Simple shuffle and slice
  const shuffled = [...classPool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}
