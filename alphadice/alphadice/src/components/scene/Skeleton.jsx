import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useGame } from "../../store/gameStore";
import { ENEMIES } from "../../data/enemies";
import { useCharacterRig, ANIM } from "../../hooks/useCharacterRig";
import HandSlotWeapon from "./HandSlotWeapon";

export default function Skeleton({ enemy, position }) {
  const group = useRef();
  const def = ENEMIES[enemy.type];
  const shaking = useGame((s) => s.shakingEntity === enemy.id);
  const attackingIndex = useGame((s) => s.enemyAttackingIndex);
  const enemies = useGame((s) => s.enemies);
  const myIndex = enemies.findIndex((e) => e.id === enemy.id);
  const isAttacking = attackingIndex === myIndex;

  // For the head-anchored HP bar
  const targetIndex = useGame((s) => s.targetIndex);
  const turnState = useGame((s) => s.turnState);
  const setTarget = useGame((s) => s.setTarget);
  const isTarget = targetIndex === myIndex;

  const { model, api } = useCharacterRig(def.model, { rig: def.rig || "medium" });

  // Head offset for the HP bar — Rig_Large characters (Golem) are taller.
  const headOffsetY = def.rig === "large" ? 2.8 : 2.0;

  const wasAliveRef = useRef(true);
  const wasAttackingRef = useRef(false);

  // Resolve which attack clip this enemy plays.
  // Falls back to MELEE_BASIC if the configured name isn't in ANIM.
  const attackClip = ANIM[def.attackAnim] || ANIM.MELEE_BASIC;

  // Initial idle — useLayoutEffect runs before paint, so the pose is set
  // before the first visible frame (avoids T-pose flash on spawn).
  useLayoutEffect(() => {
    api.play(ANIM.SKELETON_IDLE, { loop: true, fade: 0 });
  }, [api]);

  // Death animation when killed
  useEffect(() => {
    if (wasAliveRef.current && !enemy.alive) {
      api.play(ANIM.SKELETON_DEATH, { loop: false, fade: 0.15 });
    } else if (!wasAliveRef.current && enemy.alive) {
      api.play(ANIM.SKELETON_IDLE, { loop: true, fade: 0.15 });
    }
    wasAliveRef.current = enemy.alive;
  }, [enemy.alive, api]);

  // Attack animation when this enemy attacks — uses per-enemy clip.
  useEffect(() => {
    if (isAttacking && !wasAttackingRef.current && enemy.alive) {
      api.play(attackClip, {
        loop: false,
        fade: 0.1,
        returnTo: ANIM.SKELETON_IDLE,
      });
    }
    wasAttackingRef.current = isAttacking;
  }, [isAttacking, enemy.alive, api, attackClip]);

  // Hit reaction when shake fires (covers both real hits and dodges —
  // the difference is conveyed by the floating text and HP change in the HUD).
  useEffect(() => {
    if (shaking && enemy.alive) {
      api.play(ANIM.HIT, { loop: false, fade: 0.05, returnTo: ANIM.SKELETON_IDLE });
    }
  }, [shaking, enemy.alive, api]);

  useFrame(() => {
    if (!group.current) return;
    const shakeX = shaking ? (Math.random() - 0.5) * 0.1 : 0;
    const shakeZ = shaking ? (Math.random() - 0.5) * 0.1 : 0;

    group.current.position.set(
      position[0] + shakeX,
      position[1],
      position[2] + shakeZ
    );
    // Face the player. Player is at world (-3.8, _, 1). With the model
    // rigged facing +Z, atan2 of (dx, dz) gives the right Y rotation so
    // the skeleton looks at the player regardless of its (x, z) spot —
    // important now that enemies are arranged diagonally rather than
    // in a single row.
    const dx = -3.8 - position[0];
    const dz = 1 - position[2];
    group.current.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
      {def.weapons?.right && (
        <HandSlotWeapon
          model={model}
          slotName="handslot.r"
          weaponId={def.weapons.right}
        />
      )}
      {def.weapons?.left && (
        <HandSlotWeapon
          model={model}
          slotName="handslot.l"
          weaponId={def.weapons.left}
        />
      )}

      {/* HP bar anchored above the enemy's head. Hidden once dead. */}
      {enemy.alive && (
        <Html
          position={[0, headOffsetY, 0]}
          center
          // Don't pass distanceFactor at all (passing null/undefined explicitly
          // can hit edge cases in drei). Default is fixed-pixel size.
        >
          <EnemyHpBar
            enemy={enemy}
            isTarget={isTarget}
            canTarget={turnState === "player_turn"}
            onTarget={() => setTarget(myIndex)}
          />
        </Html>
      )}
    </group>
  );
}

// === HP bar component — DOM rendered via drei's <Html> ===
function EnemyHpBar({ enemy, isTarget, canTarget, onTarget }) {
  const pct = (enemy.hp / enemy.maxHp) * 100;
  const hasDot = enemy.statusEffects?.some((e) => e.kind === "dot");
  const hasBurn = enemy.statusEffects?.some((e) => e.kind === "burn");
  const cd = enemy.attackCountdownCurrent;
  const isImminent = cd <= 1;

  return (
    <div
      style={{
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        minWidth: 100,
      }}
    >
      <button
        type="button"
        onClick={canTarget ? onTarget : undefined}
        disabled={!canTarget}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: canTarget ? "pointer" : "default",
          display: "block",
        }}
      >
        <div
          style={{
            width: 100,
            height: 18,
            background: "#1a1410",
            border: "2px solid #1a1410",
            position: "relative",
            overflow: "hidden",
            outline: isTarget ? "3px solid #ffd700" : "none",
            outlineOffset: "2px",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(180deg, #ff5555 0%, #c9302c 100%)",
              transition: "width 300ms ease",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-arcade)",
              fontSize: 9,
              color: "white",
              textShadow: "1px 1px 0 #000",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {enemy.hp}/{enemy.maxHp}
          </span>
        </div>
      </button>

      {/* Countdown pill — turns until this enemy attacks */}
      <div
        title={`${cd}턴 후 공격`}
        style={{
          background: isImminent ? "#c9302c" : "#3a2a20",
          color: "white",
          fontFamily: "var(--font-arcade)",
          fontSize: 10,
          padding: "2px 6px",
          border: "1.5px solid #1a1410",
          boxShadow: "1px 1px 0 rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          animation: isImminent ? "pulse 800ms ease-in-out infinite" : "none",
        }}
      >
        ⏱ {cd}
      </div>

      {/* Status effect icons (DoT, burn) */}
      {(hasDot || hasBurn) && (
        <div
          style={{
            display: "flex",
            gap: 3,
            fontSize: 12,
            textShadow: "1px 1px 0 #1a1410",
          }}
        >
          {hasDot && <span title="독">🐍</span>}
          {hasBurn && <span title="화상">🔥</span>}
        </div>
      )}

      {isTarget && canTarget && (
        <div
          style={{
            fontFamily: "var(--font-arcade)",
            fontSize: 14,
            color: "#ffd700",
            textShadow: "1px 1px 0 #1a1410",
            animation: "bob 700ms ease-in-out infinite",
            marginTop: -2,
          }}
        >
          ▼
        </div>
      )}
    </div>
  );
}
