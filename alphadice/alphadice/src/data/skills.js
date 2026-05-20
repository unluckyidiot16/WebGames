// === Skill catalog ===
//
// Each skill is a recipe for an action that consumes some dice.
//
// Fields:
//   id            : unique slug
//   name          : display name (Korean)
//   description   : short tooltip
//   icon          : emoji shown on the card
//   slots         : how many dice it needs. Can be a single number (4) or a
//                   range tuple [3, 7] (basic attack accepts 3..7).
//   shape         : 2D matrix of 1s/0s describing the skill's grid footprint.
//                   1 = occupied cell, 0 = empty. The shape is stored at
//                   rotation 0 and rotated 90°/180°/270° clockwise via the
//                   rotateShape helper. Bigger shapes = stronger skills.
//                   Examples:
//                     [[1]]               1×1
//                     [[1,1]]             1×2 horizontal
//                     [[1,1,1]]           1×3 horizontal
//                     [[1,1],[1,1]]       2×2
//                     [[1,1],[1,0]]       L-shape (3 cells)
//   requireWord   : true → the dice in order must form a valid English word.
//                   false → just match the slot count (no skill uses this yet,
//                   but reserved for future "rune" type skills).
//   cooldown      : turns to wait after use. 0 = no cooldown (basic attack).
//   targeting     : "single" | "all_enemies" | "self"
//   effect        : function-like description, parsed by the action runner.
//                   Each effect type:
//                     damage:    { type: "damage", formula: "by_length" | <number> }
//                     damageAll: same as damage but hits every alive enemy (formula scaled)
//                     stun:      { type: "stun", turns: 1 }      // adds to enemy countdown
//                     shield:    { type: "shield", amount: 8 }   // grants player shield HP
//                     dot:       { type: "dot", damage: 3, turns: 3 } // damage over time
//                     dualHit:   { type: "dualHit" }             // splits to 2 strikes
//                     burn:      same shape as dot
//   classRestrict : optional array of character ids; if absent, anyone can use.
//
// Damage formulas:
//   "by_length"  : 3→6, 4→10, 5→16, 6→25, 7→40 (matches utils/dice.js)
//   <number>     : flat damage
//   { base: 8, perLetter: 2 } : base + length * perLetter

export const SKILLS = {
  // ----- BASIC ATTACK (everyone has this) -----
  basic_attack: {
    id: "basic_attack",
    name: "기본 공격",
    description: "3~7글자 영단어로 공격. 쿨다운 없음.",
    icon: "/ui/card/sword.png",
    slots: [3, 7],
    shape: [[1, 1]],
    requireWord: true,
    cooldown: 0,
    targeting: "single",
    effects: [{ type: "damage", formula: "by_length" }],
  },

  // ----- KNIGHT -----
  knight_shield_bash: {
    id: "knight_shield_bash",
    name: "방패 강타",
    description: "4글자 영단어. 데미지 + 적의 공격 카운트다운 +1 (스턴).",
    icon: "/ui/card/shield.png",
    slots: 4,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 3,
    targeting: "single",
    effects: [
      { type: "damage", formula: "by_length" },
      { type: "stun", turns: 1 },
    ],
    classRestrict: ["knight"],
  },
  knight_cross_slash: {
    id: "knight_cross_slash",
    name: "십자가 베기",
    description: "3글자 영단어. 받는 데미지를 다음 턴 줄여주는 방어막 8 획득.",
    icon: "/ui/card/sword_break.png",
    slots: 3,
    shape: [[1, 1]],
    requireWord: true,
    cooldown: 2,
    targeting: "self",
    effects: [{ type: "shield", amount: 8 }],
    classRestrict: ["knight"],
  },

  // ----- ROGUE -----
  rogue_poison_blade: {
    id: "rogue_poison_blade",
    name: "독칼",
    description: "3글자 영단어. 데미지 + 3턴간 매 턴 3 도트 데미지.",
    icon: "/ui/card/leaf.png",
    slots: 3,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 2,
    targeting: "single",
    effects: [
      { type: "damage", formula: "by_length" },
      { type: "dot", damage: 3, turns: 3 },
    ],
    classRestrict: ["rogue"],
  },
  rogue_dual_strike: {
    id: "rogue_dual_strike",
    name: "연속 베기",
    description: "4글자 영단어. 단일 적에게 2번 연속 공격 (피해 분할).",
    icon: "/ui/card/dagger.png",
    slots: 4,
    shape: [[1, 1, 1]],
    requireWord: true,
    cooldown: 3,
    targeting: "single",
    effects: [{ type: "dualHit", formula: "by_length" }],
    classRestrict: ["rogue"],
  },

  // ----- MAGE -----
  mage_fireball: {
    id: "mage_fireball",
    name: "파이어볼",
    description: "4글자 영단어. 큰 데미지 + 2턴간 화상 (매 턴 4).",
    icon: "/ui/card/fire.png",
    slots: 4,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 3,
    targeting: "single",
    effects: [
      { type: "damage", formula: { base: 14, perLetter: 0 } },
      { type: "burn", damage: 4, turns: 2 },
    ],
    classRestrict: ["mage"],
  },
  mage_magic_missile: {
    id: "mage_magic_missile",
    name: "마법탄",
    description: "아무 글자 3개. 약한 즉발 데미지. 쿨다운 짧음.",
    icon: "/ui/card/magic.png",
    slots: 3,
    shape: [[1]],
    requireWord: false,     // letters-only — no dictionary check
    cooldown: 1,
    targeting: "single",
    effects: [{ type: "damage", formula: 7 }],
    classRestrict: ["mage"],
  },

  // ----- RANGER -----
  // ----- BARBARIAN -----
  barbarian_smash: {
    id: "barbarian_smash",
    name: "강타",
    description: "3글자 영단어. 무거운 일격 — 보너스 +5 데미지.",
    icon: "/ui/card/hammer.png",
    slots: 3,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 2,
    targeting: "single",
    effects: [
      { type: "damage", formula: "by_length" },
      { type: "damage", amount: 5 },
    ],
    classRestrict: ["barbarian"],
  },
  barbarian_roar: {
    id: "barbarian_roar",
    name: "포효",
    description: "4글자 영단어. 자신에게 8 방패막 + 다음 공격 +3 데미지.",
    icon: "/ui/card/exclamation.png",
    slots: 4,
    shape: [[1, 1, 1]],
    requireWord: true,
    cooldown: 3,
    targeting: "self",
    effects: [
      { type: "shield", amount: 8 },
      { type: "buff_next_attack", amount: 3 },
    ],
    classRestrict: ["barbarian"],
  },

  // ============================================================
  // Cross-class reward skills (no classRestrict — drawn into the
  // reward pool by pickRewardSkillChoices). These exist because each
  // class's starting loadout already covers all its class-restricted
  // skills, so without these the reward picker would have nothing to
  // offer. Effects intentionally overlap class identity skills to give
  // variety without stepping on signature class moves.
  // ============================================================
  rapid_jab: {
    id: "rapid_jab",
    name: "잽",
    description: "3글자 영단어. 빠른 일격. 쿨다운 없음.",
    icon: "/ui/card/fist.png",
    slots: 3,
    shape: [[1]],
    requireWord: true,
    cooldown: 0,
    targeting: "single",
    effects: [{ type: "damage", formula: "by_length" }],
  },
  heavy_swing: {
    id: "heavy_swing",
    name: "묵직한 휘두르기",
    description: "5글자 영단어. 한 방에 큰 데미지.",
    icon: "/ui/card/hammer.png",
    slots: 5,
    shape: [[1, 1, 1]],
    requireWord: true,
    cooldown: 2,
    targeting: "single",
    effects: [{ type: "damage", formula: "by_length" }],
  },
  iron_guard: {
    id: "iron_guard",
    name: "철벽",
    description: "3글자 영단어. 자신에게 7 방패막.",
    icon: "/ui/card/shield.png",
    slots: 3,
    shape: [[1, 1]],
    requireWord: true,
    cooldown: 2,
    targeting: "self",
    effects: [{ type: "shield", amount: 7 }],
  },
  bleed: {
    id: "bleed",
    name: "출혈",
    description: "3글자 영단어. 데미지 + 3턴간 매 턴 2 도트.",
    icon: "/ui/card/water.png",
    slots: 3,
    shape: [[1, 1], [1, 0]],
    requireWord: true,
    cooldown: 2,
    targeting: "single",
    effects: [
      { type: "damage", formula: "by_length" },
      { type: "dot", damage: 2, turns: 3 },
    ],
  },
  searing_burst: {
    id: "searing_burst",
    name: "작열",
    description: "4글자 영단어. 데미지 + 2턴간 3 화상.",
    icon: "/ui/card/fire.png",
    slots: 4,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 3,
    targeting: "single",
    effects: [
      { type: "damage", formula: "by_length" },
      { type: "burn", damage: 3, turns: 2 },
    ],
  },
  stunning_jab: {
    id: "stunning_jab",
    name: "충격 펀치",
    description: "4글자 영단어. 데미지 + 적 카운트다운 +2.",
    icon: "/ui/card/aim.png",
    slots: 4,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 3,
    targeting: "single",
    effects: [
      { type: "damage", formula: "by_length" },
      { type: "stun", turns: 2 },
    ],
  },
  second_wind: {
    id: "second_wind",
    name: "재정비",
    description: "3글자 영단어. 자신에게 12 방패막. 큰 쿨다운.",
    icon: "/ui/card/wings.png",
    slots: 3,
    shape: [[1, 1], [1, 1]],
    requireWord: true,
    cooldown: 4,
    targeting: "self",
    effects: [{ type: "shield", amount: 12 }],
  },

  // ============================================================
  // Pattern-based skills (Sprint 3) — reward dice arrangement over
  // vocabulary. These don't require a valid English word; instead they
  // ask for specific letter compositions: triple-of-a-kind, vowel-heavy,
  // consonant-heavy. Designed as risk/reward alternatives when you can't
  // form a word from a bad roll.
  // ============================================================

  triple_strike: {
    id: "triple_strike",
    name: "삼중 일격",
    description: "같은 글자 3개. 무거운 일격 — 큰 데미지.",
    icon: "/ui/card/aim.png",
    slots: [3, 3],
    shape: [[1, 1, 1]],
    requireSameLetter: 3,
    cooldown: 2,
    targeting: "single",
    effects: [{ type: "damage", amount: 18 }],
  },

  combo_burn: {
    id: "combo_burn",
    name: "모음 폭발",
    description: "모음 3개 이상. 폭발 데미지 + 화상 3턴.",
    icon: "/ui/card/fire.png",
    slots: [3, 5],
    shape: [[1, 1], [1, 1]],
    requireVowels: 3,
    cooldown: 3,
    targeting: "single",
    effects: [
      { type: "damage", amount: 10 },
      { type: "burn", damage: 3, turns: 3 },
    ],
  },

  brutal_smash: {
    id: "brutal_smash",
    name: "파쇄",
    description: "자음 4개 이상. 큰 데미지 + 스턴 1턴.",
    icon: "/ui/card/hammer.png",
    slots: [4, 5],
    shape: [[1, 1], [1, 1]],
    requireConsonants: 4,
    cooldown: 3,
    targeting: "single",
    effects: [
      { type: "damage", amount: 14 },
      { type: "stun", turns: 1 },
    ],
  },

  pair_shield: {
    id: "pair_shield",
    name: "쌍방벽",
    description: "같은 글자 2개. 자신에게 8 방패막. 짧은 쿨다운.",
    icon: "/ui/card/shield.png",
    slots: [2, 2],
    shape: [[1, 1]],
    requireSameLetter: 2,
    cooldown: 2,
    targeting: "self",
    effects: [{ type: "shield", amount: 8 }],
  },
};

// Helper: list skill ids available to a given character (basic + class skills).
export function skillsForCharacter(characterId) {
  const ids = ["basic_attack"];
  for (const [id, s] of Object.entries(SKILLS)) {
    if (id === "basic_attack") continue;
    if (!s.classRestrict || s.classRestrict.includes(characterId)) {
      ids.push(id);
    }
  }
  return ids;
}

// Default starting loadout per class — basic_attack (always available,
// outside the inventory grid) + 1 class skill (occupies grid space).
// Players earn additional skills as rewards from elite/boss encounters
// and manage them via the bag system on the map screen.
export const STARTING_LOADOUTS = {
  knight:    ["basic_attack", "knight_shield_bash"],
  rogue:     ["basic_attack", "rogue_poison_blade"],
  mage:      ["basic_attack", "mage_fireball"],
  barbarian: ["basic_attack", "barbarian_smash"],
};

// Resolve the slot count of a skill (handles range vs scalar).
export function skillSlotCount(skill, dieCount) {
  if (Array.isArray(skill.slots)) {
    // Range — dieCount must be within [min, max].
    return { min: skill.slots[0], max: skill.slots[1] };
  }
  return { min: skill.slots, max: skill.slots };
}

// Validate: do the assigned dice satisfy this skill's requirements?
//
// Returns { ok: boolean, reason?: string, word?: string }
export function validateSkillDice(skill, dice, isValidWord) {
  const count = dice.length;
  const { min, max } = skillSlotCount(skill);

  if (count < min) {
    return { ok: false, reason: `다이스 ${min}개 필요` };
  }
  if (count > max) {
    return { ok: false, reason: `다이스 ${max}개까지` };
  }

  const word = dice.map((d) => d.face).join("");

  if (skill.requireWord) {
    if (!isValidWord(word)) {
      return { ok: false, reason: "사전에 없음", word };
    }
  }

  return { ok: true, word };
}

// ============================================================
// Skill reward picker (Phase 3)
// ============================================================
//
// Pick `count` candidate skills the player doesn't already own. Class
// affinity is respected — if a skill has classRestrict, only that class
// can receive it. basic_attack is excluded since everyone starts with it.
//
// Returns at most `count` skill ids. Returns fewer if the pool is small
// (e.g. very late in a run when most class skills are already owned).
export function pickRewardSkillChoices(
  characterId,
  ownedSkillIds,
  count = 3,
  rng = Math.random,
) {
  const owned = new Set(ownedSkillIds);
  const pool = Object.values(SKILLS).filter((s) => {
    if (s.id === "basic_attack") return false;
    if (owned.has(s.id)) return false;
    if (s.classRestrict && !s.classRestrict.includes(characterId)) return false;
    return true;
  });
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map((s) => s.id);
}

// ============================================================
// Grid inventory helpers (Phase 2)
// ============================================================
//
// Skills carry a 2D `shape` matrix (1 = occupied, 0 = empty). On the
// inventory grid, each placement records the skill's top-left corner
// (x, y) and a rotation (0/1/2/3 = 0°/90°/180°/270° clockwise).
//
// The rotated shape is computed on the fly from the canonical shape +
// rotation index — we never store the rotated matrix.

// Rotate a 2D shape matrix 90° clockwise once.
function rotateOnce(shape) {
  const h = shape.length;
  const w = shape[0].length;
  const out = [];
  for (let y = 0; y < w; y++) {
    const row = new Array(h);
    for (let x = 0; x < h; x++) {
      row[x] = shape[h - 1 - x][y];
    }
    out.push(row);
  }
  return out;
}

// Return shape after rotating `rotation` times (0..3) clockwise.
export function rotateShape(shape, rotation) {
  let s = shape;
  const r = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < r; i++) s = rotateOnce(s);
  return s;
}

// Width / height of a (possibly rotated) shape.
export function shapeBounds(shape) {
  return { w: shape[0].length, h: shape.length };
}

// List of occupied (dx, dy) offsets inside a shape (canonical or rotated).
export function shapeCells(shape) {
  const cells = [];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) cells.push({ x, y });
    }
  }
  return cells;
}

// Total number of occupied cells.
export function shapeArea(shape) {
  let n = 0;
  for (const row of shape) for (const v of row) if (v) n++;
  return n;
}

// Greedy packing: try to place each skill into a width×height grid.
// Larger skills are placed first. For each skill, every (rotation, x, y)
// combination is attempted until one fits (no overlap, in-bounds). Skills
// that don't fit are silently skipped — caller is responsible for warning
// the user if e.g. an inventory expansion is needed.
//
// Returns { placements: [{skillId, x, y, rotation}], unplaced: [skillId, ...] }
// Try to find a placement for a single new skill given existing placements.
// Used when a reward grants a skill — we want to auto-place it if there's
// room. Returns { x, y, rotation } or null if no fit.
export function tryPlaceSkill(skillId, existingPlacements, width, height) {
  const skill = SKILLS[skillId];
  if (!skill || !skill.shape) return null;

  // Build occupancy from existing placements.
  const occupied = Array.from({ length: height }, () =>
    new Array(width).fill(false),
  );
  for (const p of existingPlacements) {
    const s = SKILLS[p.skillId];
    if (!s) continue;
    const r = rotateShape(s.shape, p.rotation);
    for (const c of shapeCells(r)) {
      const gy = p.y + c.y;
      const gx = p.x + c.x;
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
        occupied[gy][gx] = true;
      }
    }
  }

  // Try each rotation × position.
  for (let rot = 0; rot < 4; rot++) {
    const rotated = rotateShape(skill.shape, rot);
    const { w, h } = shapeBounds(rotated);
    if (w > width || h > height) continue;
    for (let y = 0; y <= height - h; y++) {
      for (let x = 0; x <= width - w; x++) {
        let fits = true;
        for (const c of shapeCells(rotated)) {
          if (occupied[y + c.y][x + c.x]) {
            fits = false;
            break;
          }
        }
        if (fits) return { x, y, rotation: rot };
      }
    }
  }
  return null;
}

export function packSkillsIntoGrid(skillIds, width, height) {
  // Sort by area descending so big shapes get first dibs.
  const sorted = [...skillIds].sort((a, b) => {
    const sa = SKILLS[a]?.shape ?? [[1]];
    const sb = SKILLS[b]?.shape ?? [[1]];
    return shapeArea(sb) - shapeArea(sa);
  });

  const occupied = Array.from({ length: height }, () =>
    new Array(width).fill(false),
  );
  const placements = [];
  const unplaced = [];

  for (const skillId of sorted) {
    const skill = SKILLS[skillId];
    if (!skill || !skill.shape) {
      unplaced.push(skillId);
      continue;
    }

    let placed = false;
    rotLoop:
    for (let rot = 0; rot < 4; rot++) {
      const rotated = rotateShape(skill.shape, rot);
      const { w, h } = shapeBounds(rotated);
      if (w > width || h > height) continue;

      for (let y = 0; y <= height - h; y++) {
        for (let x = 0; x <= width - w; x++) {
          let fits = true;
          for (const c of shapeCells(rotated)) {
            if (occupied[y + c.y][x + c.x]) {
              fits = false;
              break;
            }
          }
          if (fits) {
            for (const c of shapeCells(rotated)) {
              occupied[y + c.y][x + c.x] = true;
            }
            placements.push({ skillId, x, y, rotation: rot });
            placed = true;
            break rotLoop;
          }
        }
      }
    }

    if (!placed) unplaced.push(skillId);
  }

  return { placements, unplaced };
}
