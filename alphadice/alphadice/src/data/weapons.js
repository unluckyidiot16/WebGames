// === Weapon attachment data ===
//
// KayKit weapons attach to a character's `handslot.r` or `handslot.l` bone.
// The handslot bone is authored by KayKit's rigger to already be in the
// correct orientation for their weapons — so in theory rotation [0,0,0]
// should look natural for most weapons in the idle pose.
//
// In practice, some weapons (especially bows, shields, or anything used
// in the off-hand) may need a small offset. Each entry below exposes
// position / rotation / scale as tunable so per-weapon tweaks are local.
//
// To tune a weapon: change rotation here, hot-reload, observe in idle pose,
// then watch through the attack animation to confirm the swing reads.

// Standard zero offsets — most KayKit weapons work as-is.
const DEFAULT = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
};

export const WEAPONS = {
  // === PLAYER (knight) — Rig_Medium ===
  sword_1handed: {
    ...DEFAULT,
    model: "/models/weapons/sword_1handed.gltf",
  },
  shield_round_color: {
    ...DEFAULT,
    model: "/models/weapons/shield_round_color.gltf",
  },

  // === PLAYER (rogue) ===
  bow_withString: {
    ...DEFAULT,
    model: "/models/weapons/bow_withString.gltf",
    // KayKit bow modeled with length along +Z. After handslot.l's built-in
    // -90° Z rotation, the bow appears upside-down by default. Flip 180°
    // around X to bring the top tip back up.
    //
    // If still wrong, try one of these alternatives:
    //   rotation: [0, Math.PI, 0]     // flip around Y (mirrors front/back)
    //   rotation: [0, 0, Math.PI]     // spin around bow length (flips curve direction)
    //   rotation: [-Math.PI / 2, 0, 0]
    rotation: [Math.PI, 0, 0],
  },
  arrow_bow: {
    ...DEFAULT,
    model: "/models/weapons/arrow_bow.gltf",
    // Arrow shouldn't be nocked in idle pose — only appear during attack.
    // PlayerCharacter watches playerAnim and toggles `visible` accordingly.
    hideWhenIdle: true,
  },

  // === PLAYER (mage) ===
  staff: {
    ...DEFAULT,
    model: "/models/weapons/staff.gltf",
  },
  wand: {
    ...DEFAULT,
    model: "/models/weapons/wand.gltf",
  },
  spellbook_open: {
    ...DEFAULT,
    model: "/models/weapons/spellbook_open.gltf",
  },

  // === PLAYER (rogue / druid / engineer — ready for future classes) ===
  dagger: { ...DEFAULT, model: "/models/weapons/dagger.gltf" },
  smokebomb: { ...DEFAULT, model: "/models/weapons/smokebomb.gltf" },
  druid_staff: { ...DEFAULT, model: "/models/weapons/druid_staff.gltf" },
  engineer_wrench: { ...DEFAULT, model: "/models/weapons/engineer_Wrench.gltf" },

  // === Rig_Large variants ===
  axe_2handed_large: {
    ...DEFAULT,
    model: "/models/weapons/axe_2handed_Large.gltf",
  },
  shield_round_barbarian: {
    ...DEFAULT,
    model: "/models/weapons/shield_round_barbarian.gltf",
  },

  // === ENEMY weapons (skeletons) ===
  skeleton_blade: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Blade.gltf",
  },
  skeleton_dagger: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Dagger.gltf",
  },
  skeleton_staff: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Staff.gltf",
  },
  skeleton_scythe: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Scythe.gltf",
  },
  skeleton_axe: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Axe.gltf",
  },
  skeleton_mace: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Mace.gltf",
  },
  skeleton_shield_small: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Shield_Small_A.gltf",
  },
  skeleton_shield_large: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Shield_Large_A.gltf",
  },
  skeleton_golem_axe: {
    ...DEFAULT,
    model: "/models/weapons/Skeleton_Golem_Axe_Large.gltf",
  },
};
