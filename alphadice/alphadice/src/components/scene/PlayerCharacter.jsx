import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../../store/gameStore";
import { useCharacterRig, ANIM } from "../../hooks/useCharacterRig";
import { WEAPONS } from "../../data/weapons";
import HandSlotWeapon from "./HandSlotWeapon";

// Map store playerAnim → clip name based on character class
function pickClip(animState, characterId) {
  if (animState === "idle") return ANIM.IDLE;
  if (animState === "hit") return ANIM.HIT;
  if (animState === "Special") {
    if (characterId === "mage") return ANIM.RANGED_SPELLCAST;
    if (characterId === "rogue") return ANIM.MELEE_DUAL_SLICE;
    return ANIM.MELEE_SPECIAL;
  }
  if (animState === "CombatMelee") {
    if (characterId === "rogue") return ANIM.MELEE_DUAL_STAB;
    return ANIM.MELEE_BASIC;
  }
  if (animState === "CombatRanged") {
    if (characterId === "mage") return ANIM.RANGED_MAGIC;
    return ANIM.RANGED_BOW;
  }
  return ANIM.IDLE;
}

const ONE_SHOT_STATES = new Set(["hit", "Special", "CombatMelee", "CombatRanged"]);

// Anim states that count as "actively attacking" — used to gate weapons
// that should only appear during an attack (e.g. arrows, spellbooks).
const ATTACK_STATES = new Set(["CombatMelee", "CombatRanged", "Special"]);

// Helper: a weapon is visible UNLESS it has hideWhenIdle and we're not
// currently mid-attack.
function isWeaponVisible(weaponId, playerAnim) {
  if (!weaponId) return false;
  const w = WEAPONS[weaponId];
  if (!w) return false;
  if (w.hideWhenIdle && !ATTACK_STATES.has(playerAnim)) return false;
  return true;
}

export default function PlayerCharacter({ character, position }) {
  const group = useRef();
  const playerAnim = useGame((s) => s.playerAnim);
  const shaking = useGame((s) => s.shakingEntity === "player");
  const dash = useGame((s) => s.playerDash);

  const { model, api } = useCharacterRig(character.model, { rig: character.rig || "medium" });

  // Start idle on mount — useLayoutEffect runs synchronously after commit
  // but BEFORE the browser paints, so the IDLE pose is applied before the
  // first visible frame (avoids a T-pose flash on character spawn).
  useLayoutEffect(() => {
    api.play(ANIM.IDLE, { loop: true, fade: 0 });
  }, [api]);

  // React to playerAnim state changes
  useEffect(() => {
    const clip = pickClip(playerAnim, character.id);
    if (ONE_SHOT_STATES.has(playerAnim)) {
      api.play(clip, { loop: false, fade: 0.12, returnTo: ANIM.IDLE });
    } else {
      api.play(clip, { loop: true, fade: 0.2 });
    }
  }, [playerAnim, character.id, api]);

  // Easing — quick start, smooth deceleration. Good "lunge" feel.
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  useFrame(() => {
    if (!group.current) return;
    const shakeX = shaking ? (Math.random() - 0.5) * 0.12 : 0;
    const shakeZ = shaking ? (Math.random() - 0.5) * 0.12 : 0;

    // Dash offset — interpolates between (0,0) and (targetX, targetZ)
    // based on the current phase. sequence.js drives phase transitions;
    // this just samples the time-based curve.
    let dashX = 0;
    let dashZ = 0;
    if (dash) {
      const elapsed = performance.now() - dash.startTime;
      const tRaw = Math.min(1, elapsed / dash.duration);
      const t = easeOutCubic(tRaw);
      if (dash.phase === "out") {
        dashX = dash.targetX * t;
        dashZ = dash.targetZ * t;
      } else if (dash.phase === "hold") {
        // Frozen at target during the strike anim
        dashX = dash.targetX;
        dashZ = dash.targetZ;
      } else if (dash.phase === "back") {
        dashX = dash.targetX * (1 - t);
        dashZ = dash.targetZ * (1 - t);
      }
    }

    group.current.position.set(
      position[0] + dashX + shakeX,
      position[1],
      position[2] + dashZ + shakeZ
    );
    // Face +x (toward enemies on the right). KayKit default forward is -z,
    // so rotate +90° around y to face +x.
    group.current.rotation.y = Math.PI / 2;
  });

  return (
    <group ref={group}>
      <primitive object={model} />
      {character.weapons?.right && (
        <HandSlotWeapon
          model={model}
          slotName="handslot.r"
          weaponId={character.weapons.right}
          visible={isWeaponVisible(character.weapons.right, playerAnim)}
        />
      )}
      {character.weapons?.left && (
        <HandSlotWeapon
          model={model}
          slotName="handslot.l"
          weaponId={character.weapons.left}
          visible={isWeaponVisible(character.weapons.left, playerAnim)}
        />
      )}
    </group>
  );
}
