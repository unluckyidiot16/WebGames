// === Characters (MVP — 4 classes) ===
//
// Each class starts with 5 dice (6 sides each). Starting dice are curated
// so each rolls letter pools that build their thematic vocabulary:
//   • knight    → STAB, SWORD, BLADE, ARMOR — common consonants + vowels
//   • rogue     → DASH, STAB, KILL, DAGGER — high T/S/D repetition
//   • mage      → MAGIC, ZAP, JINX, WIZARD — rare letters available
//   • barbarian → RAGE, SMASH, ROAR, CRUSH — heavy consonant repetition
//
// Class passives:
//   • maxRerolls : total rerolls per turn (default 1)
//   • convertOne : convert one die face per turn (mage only)
//
// Portrait: /ui/portrait/<Color>_<Class>_Badge.png. The portrait color is
// chosen to match the class accent so character cards read at a glance.

export const CHARACTERS = {
  knight: {
    id: "knight",
    name: "기사",
    nameEn: "Knight",
    tagline: "균형 잡힌 검사",
    description: "흔한 글자로 안정적인 단어를 만들어 강하게 베어낸다.",
    model: "/models/characters/Knight.glb",
    portrait: "/ui/portrait/Blue_Knight_Badge.png",
    hp: 40,
    color: "#2d5b8a",
    accentColor: "#5a91c4",
    skill: { name: "재정비", description: "리롤 2회.", maxRerolls: 2 },
    weapon: "sword",
    attackAnim: "CombatMelee",
    rangedAnim: "CombatMelee",
    weapons: { right: "sword_1handed", left: "shield_round_color" },
    startingDice: [
      ["A", "A", "E", "E", "I", "O"],
      ["S", "S", "T", "T", "N", "R"],
      ["B", "B", "L", "D", "M", "H"],
      ["R", "R", "N", "L", "H", "D"],
      ["A", "E", "T", "S", "I", "N"],
    ],
  },

  rogue: {
    id: "rogue",
    name: "도적",
    nameEn: "Rogue",
    tagline: "양손, 두 번, 한 호흡",
    description: "양손 단검으로 빠르게 베어낸다. 짧고 강한 단어로 도트를 쌓는다.",
    model: "/models/characters/Rogue_Hooded.glb",
    portrait: "/ui/portrait/Green_Rogue_Badge.png",
    rig: "medium",
    hp: 28,
    color: "#2a6a3a",
    accentColor: "#5fb377",
    skill: { name: "민첩", description: "리롤 2회.", maxRerolls: 2 },
    weapon: "daggers",
    attackAnim: "CombatMelee",
    rangedAnim: "CombatMelee",
    weapons: { right: "dagger", left: "dagger" },
    startingDice: [
      ["A", "A", "E", "I", "O", "U"],
      ["S", "S", "T", "T", "L", "R"],
      ["D", "D", "K", "K", "N", "R"],
      ["T", "S", "B", "P", "H", "L"],
      ["A", "E", "I", "L", "N", "T"],
    ],
  },

  mage: {
    id: "mage",
    name: "마법사",
    nameEn: "Mage",
    tagline: "단어의 연금술사",
    description: "다양한 글자로 길고 어려운 단어를 엮어 강력한 마법을 시전한다.",
    model: "/models/characters/Mage.glb",
    portrait: "/ui/portrait/Red_Mage_Badge.png",
    hp: 30,
    color: "#8a2a2a",
    accentColor: "#c95a5a",
    skill: {
      name: "변환",
      description: "다이스 1개를 원하는 글자로 변경 (턴당 1회).",
      maxRerolls: 1,
      convertOne: true,
    },
    weapon: "staff",
    attackAnim: "CombatRanged",
    rangedAnim: "CombatRanged",
    weapons: { right: "staff" },
    startingDice: [
      ["A", "A", "E", "I", "O", "U"],
      ["E", "I", "A", "O", "U", "Y"],
      ["Z", "X", "J", "Q", "K", "V"],
      ["M", "G", "W", "P", "B", "C"],
      ["S", "T", "N", "R", "L", "D"],
    ],
  },

  barbarian: {
    id: "barbarian",
    name: "야만전사",
    nameEn: "Barbarian",
    tagline: "분노로 박살낸다",
    description: "무거운 망치와 분노. 짧고 강한 자음 단어로 일격에 적을 쓰러뜨린다.",
    model: "/models/characters/Barbarian.glb",
    portrait: "/ui/portrait/Yellow_Barbarian_Badge.png",
    rig: "medium",
    hp: 44,                          // tankiest class
    color: "#b08020",
    accentColor: "#e8b923",
    skill: { name: "분노", description: "리롤 2회.", maxRerolls: 2 },
    weapon: "hammer",
    attackAnim: "CombatMelee",
    rangedAnim: "CombatMelee",
    weapons: { right: "warhammer_2handed" },
    // Consonant-heavy dice — fewer vowels but lots of R/S/T/K for words
    // like RAGE, SMASH, ROAR, CRUSH, BASH, GRUNT, etc.
    startingDice: [
      ["A", "A", "E", "I", "O", "U"],   // standard vowel die
      ["R", "R", "T", "T", "S", "N"],   // hard consonants
      ["S", "S", "M", "M", "H", "K"],   // smash / mash sounds
      ["B", "B", "G", "G", "R", "T"],   // brute force
      ["A", "E", "R", "S", "T", "U"],   // utility for word completion
    ],
  },
};

// Unlock order — students start with knight, earn the others by clearing.
// (See utils/profile.js: Nth in CHARACTER_UNLOCK_ORDER needs N wins.)
export const CHARACTER_ORDER = ["knight", "rogue", "mage", "barbarian"];

// === Dice deck constants ===
export const DICE_MIN = 3;
export const DICE_MAX = 10;
export const DICE_STARTING = 5;
