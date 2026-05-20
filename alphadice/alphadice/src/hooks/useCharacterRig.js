import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

// Friendly clip names mapped to KayKit clip names.
// Clip names match across Rig_Medium and Rig_Large where present.
export const ANIM = {
  IDLE: "Idle_A",
  HIT: "Hit_A",
  HIT_B: "Hit_B",
  MELEE_BASIC: "Melee_1H_Attack_Chop",
  MELEE_STRONG: "Melee_1H_Attack_Slice_Diagonal",
  MELEE_STAB: "Melee_1H_Attack_Stab",
  MELEE_SPECIAL: "Melee_2H_Attack_Spin",
  MELEE_DUAL_STAB: "Melee_Dualwield_Attack_Stab",
  MELEE_DUAL_SLICE: "Melee_Dualwield_Attack_Slice",
  MELEE_DUAL_CHOP: "Melee_Dualwield_Attack_Chop",
  RANGED_BOW: "Ranged_Bow_Release",
  RANGED_MAGIC: "Ranged_Magic_Shoot",
  RANGED_SPELLCAST: "Ranged_Magic_Spellcasting",
  SKELETON_IDLE: "Skeletons_Idle",
  SKELETON_TAUNT: "Skeletons_Taunt",
  SKELETON_DEATH: "Skeletons_Death",
  SKELETON_AWAKEN: "Skeletons_Awaken_Standing",
};

// Animation files per rig family.
// Rig_Large has no CombatRanged (large/heavy enemies don't shoot).
const RIG_FILES = {
  medium: {
    general: "/models/animations/Rig_Medium_General.glb",
    melee:   "/models/animations/Rig_Medium_CombatMelee.glb",
    ranged:  "/models/animations/Rig_Medium_CombatRanged.glb",
    special: "/models/animations/Rig_Medium_Special.glb",
  },
  large: {
    general: "/models/animations/Rig_Large_General.glb",
    melee:   "/models/animations/Rig_Large_CombatMelee.glb",
    ranged:  null,
    special: "/models/animations/Rig_Large_Special.glb",
  },
};

// Preload everything once. Total ~5–6MB.
Object.values(RIG_FILES).forEach((rig) => {
  Object.values(rig).forEach((p) => p && useGLTF.preload(p));
});

export function useCharacterRig(modelPath, { rig = "medium" } = {}) {
  const files = RIG_FILES[rig] || RIG_FILES.medium;
  const character = useGLTF(modelPath);

  // useGLTF hook count must be constant. When a rig lacks ranged, fall back
  // to its general file (already cached, no extra fetch). We just skip its
  // clips when building the clip list.
  const generalGLB = useGLTF(files.general);
  const meleeGLB   = useGLTF(files.melee);
  const rangedGLB  = useGLTF(files.ranged || files.general);
  const specialGLB = useGLTF(files.special);

  // Clone the character scene per instance so each enemy/player gets its own
  // skeleton (otherwise animations stomp on shared bones).
  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(character.scene);
    cloned.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [character.scene]);

  // Build clip list. Skip duplicates when ranged falls back to general.
  const allClips = useMemo(() => {
    const clips = [
      ...generalGLB.animations,
      ...meleeGLB.animations,
      ...specialGLB.animations,
    ];
    if (files.ranged) clips.push(...rangedGLB.animations);
    return clips;
  }, [generalGLB, meleeGLB, rangedGLB, specialGLB, files.ranged]);

  const { actions, mixer } = useAnimations(allClips, model);

  const currentRef = useRef(null);
  const returnToRef = useRef(null);

  const api = useMemo(
    () => ({
      play: (name, opts = {}) => {
        const { loop = true, fade = 0.18, returnTo = null, timeScale = 1 } = opts;
        const action = actions[name];
        if (!action) {
          console.warn(`[useCharacterRig] Missing clip: ${name} (rig=${rig})`);
          return;
        }

        // Skip if we're already playing this exact looping action — calling
        // fadeIn again would reset weight to 0 first (three.js semantics),
        // which can cause a momentary blend with the rest pose (T-pose
        // flash). For one-shots we DO want to restart, so don't skip.
        if (currentRef.current === name && loop) {
          // Refresh the returnTo intent in case the caller changed it.
          returnToRef.current = !loop && returnTo ? returnTo : null;
          return;
        }

        if (currentRef.current && currentRef.current !== name) {
          const prev = actions[currentRef.current];
          if (prev) prev.fadeOut(fade);
        }
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        action.clampWhenFinished = !loop;
        action.timeScale = timeScale;
        action.fadeIn(fade);
        action.play();
        currentRef.current = name;
        returnToRef.current = !loop && returnTo ? returnTo : null;

        // For instant transitions (fade=0), force the mixer to apply the
        // new pose immediately. Without this, between play() (in useEffect,
        // post-commit) and the next useFrame tick, the model briefly
        // renders in its rest (T) pose.
        if (fade === 0 && mixer) {
          mixer.update(0);
        }
      },
      stop: (name) => {
        if (actions[name]) actions[name].stop();
      },
      has: (name) => Boolean(actions[name]),
      actions,
      mixer,
    }),
    [actions, mixer, rig]
  );

  useEffect(() => {
    if (!mixer) return;
    const onFinished = () => {
      const back = returnToRef.current;
      if (back && actions[back]) {
        api.play(back, { loop: true, fade: 0.2 });
      }
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, actions, api]);

  return { model, api };
}
