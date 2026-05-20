// === Enemy definitions ===
// Each entry describes a baseline enemy. Per-spawn state is created in the
// store from these templates.
//
// attackCountdown — turns the player has before this enemy attacks.
//                   Decreases by 1 each enemy turn; 0 triggers attack
//                   and resets to this value.

const SKEL_TEXTURE_A = "/models/weapons/skeleton_texture_A.png";

export const ENEMIES = {
  skeleton_minion: {
    name: "졸개",
    model: "/models/characters/Skeleton_Minion.glb",
    rig: "medium",
    texture: SKEL_TEXTURE_A,
    hp: 16,
    damage: 4,
    attackType: "melee",
    attackAnim: "MELEE_BASIC",
    windupMs: 500,
    dodgeChance: 0,
    weapons: {},
    attackCountdown: 2,    // attacks every other turn (gives breathing room)
  },
  skeleton_warrior: {
    name: "전사",
    model: "/models/characters/Skeleton_Warrior.glb",
    rig: "medium",
    texture: SKEL_TEXTURE_A,
    hp: 28,
    damage: 7,
    attackType: "melee",
    attackAnim: "MELEE_STRONG",
    windupMs: 650,
    dodgeChance: 0,
    weapons: {
      right: "skeleton_blade",
      left: "skeleton_shield_small",
    },
    attackCountdown: 3,    // heavy hitter, slow buildup
  },
  skeleton_rogue: {
    name: "도적",
    model: "/models/characters/Skeleton_Rogue.glb",
    rig: "medium",
    texture: SKEL_TEXTURE_A,
    hp: 20,
    damage: 5,
    attackType: "melee",
    attackAnim: "MELEE_STAB",
    windupMs: 400,
    dodgeChance: 0.20,
    weapons: {
      right: "skeleton_dagger",
    },
    attackCountdown: 2,
  },
  skeleton_mage: {
    name: "마법사",
    model: "/models/characters/Skeleton_Mage.glb",
    rig: "medium",
    texture: SKEL_TEXTURE_A,
    hp: 22,
    damage: 6,
    attackType: "ranged",
    attackAnim: "RANGED_MAGIC",
    windupMs: 600,
    projectileMs: 450,
    projectileKind: "magic_bolt",
    dodgeChance: 0,
    weapons: {
      right: "skeleton_staff",
    },
    attackCountdown: 3,
  },
  // NOTE: skeleton_golem retained for future re-enabling once its rig
  // animation issue is fixed (currently T-poses because the "large" rig
  // animation set doesn't apply correctly). Boss spot uses skeleton_lord
  // (warrior rig + boss-tier stats) instead until then.
  skeleton_golem: {
    name: "골렘",
    model: "/models/characters/Skeleton_Golem.glb",
    rig: "large",
    texture: SKEL_TEXTURE_A,
    hp: 45,
    damage: 10,
    attackType: "melee",
    attackAnim: "MELEE_SPECIAL",
    windupMs: 1000,
    dodgeChance: 0,
    weapons: {
      right: "skeleton_golem_axe",
      left: "skeleton_shield_large",
    },
    attackCountdown: 4,
  },
  // Boss-tier melee: warrior model + scaled-up stats. Stand-in for
  // golem until the large rig animation lands.
  skeleton_lord: {
    name: "해골 군주",
    model: "/models/characters/Skeleton_Warrior.glb",
    rig: "medium",
    texture: SKEL_TEXTURE_A,
    hp: 45,
    damage: 10,
    attackType: "melee",
    attackAnim: "MELEE_STRONG",
    windupMs: 800,
    dodgeChance: 0,
    weapons: {
      right: "skeleton_blade",
      left: "skeleton_shield_small",
    },
    attackCountdown: 4,
  },
  necromancer: {
    name: "네크로맨서",
    model: "/models/characters/Necromancer.glb",
    rig: "medium",
    texture: SKEL_TEXTURE_A,
    hp: 28,
    damage: 7,
    attackType: "ranged",
    attackAnim: "RANGED_SPELLCAST",
    windupMs: 900,
    projectileMs: 550,
    projectileKind: "dark_orb",
    dodgeChance: 0.10,
    weapons: {
      right: "skeleton_scythe",
    },
    attackCountdown: 3,
  },
};

// Encounter definitions now live in src/data/runMap.js as part of the
// Phase 4A node graph. The ENEMIES dictionary above is the only export
// from this file going forward.
