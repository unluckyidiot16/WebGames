import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { WEAPONS } from "../../data/weapons";

// === HandSlotWeapon ===
//
// Attaches a weapon mesh to a named bone (typically `handslot.r` or
// `handslot.l`) of a character's cloned skeleton. The weapon then
// inherits the bone's animated transform automatically — every swing
// of the arm carries the weapon with it.
//
// Props:
//   model     — the cloned character Object3D (from useCharacterRig)
//   slotName  — "handslot.r" / "handslot.l" (dots auto-stripped at runtime)
//   weaponId  — key into WEAPONS data
//   visible   — boolean. When false, weapon hidden without re-attaching.
//   debug     — boolean. Adds a magenta wireframe marker at the bone.
//
// Diagnostic: add `?debugWeapons=1` to the URL to enable logs + markers.

// Preload all weapons listed in the data file.
Object.values(WEAPONS).forEach((w) => useGLTF.preload(w.model));

const DEBUG =
  typeof window !== "undefined" &&
  window.location?.search?.includes("debugWeapons");

export default function HandSlotWeapon({
  model,
  slotName,
  weaponId,
  visible = true,
  debug = false,
}) {
  const weapon = WEAPONS[weaponId];
  const safePath = weapon?.model || "/models/weapons/sword_1handed.gltf";
  const { scene } = useGLTF(safePath);

  // Refs to the live attached objects so we can mutate them without
  // re-running the heavy attach effect on visibility changes.
  const clonedRef = useRef(null);
  const markerRef = useRef(null);

  // === Attach effect — runs once per (model, weapon) ===
  useEffect(() => {
    if (!model || !weapon) return;

    // three.js GLTFLoader strips reserved chars from node names via
    // PropertyBinding.sanitizeNodeName. `[`, `]`, `.`, `:`, `/` are
    // removed entirely. So `handslot.r` in the GLB becomes `handslotr`
    // at runtime. Try original first, fall back to sanitized form.
    const sanitized = slotName.replace(/[\[\]\.:\/]/g, "");
    const bone =
      model.getObjectByName(slotName) ||
      model.getObjectByName(sanitized);
    if (!bone) {
      const allNames = listObjectNames(model);
      console.warn(
        `[HSW] Bone "${slotName}" (sanitized: "${sanitized}") NOT FOUND on model.\n` +
          `  weaponId: ${weaponId}\n` +
          `  All ${allNames.length} object names: ${allNames.join(", ")}`
      );
      return;
    }

    const cloned = scene.clone(true);
    cloned.position.fromArray(weapon.position);
    cloned.rotation.set(...weapon.rotation);
    cloned.scale.setScalar(weapon.scale);

    let meshCount = 0;
    cloned.traverse((o) => {
      if (o.isMesh) {
        meshCount++;
        o.castShadow = true;
        o.receiveShadow = false;
        o.frustumCulled = false;
        if (o.geometry && !o.geometry.boundingSphere) {
          o.geometry.computeBoundingSphere();
        }
      }
    });

    // Apply initial visibility before attaching
    cloned.visible = visible;

    bone.add(cloned);
    bone.updateMatrixWorld(true);
    clonedRef.current = cloned;

    if (DEBUG || debug) {
      console.log(`[HSW] attached ${weaponId} → ${slotName}`, {
        meshCount,
        bonePosition: bone.position.toArray(),
        boneRotation: bone.rotation.toArray(),
      });

      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshBasicMaterial({ color: "#ff00ff", wireframe: true })
      );
      marker.name = `__hsw_marker_${slotName}`;
      bone.add(marker);
      markerRef.current = marker;
    }

    return () => {
      bone.remove(cloned);
      if (markerRef.current) bone.remove(markerRef.current);
      cloned.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
      });
      clonedRef.current = null;
      markerRef.current = null;
    };
    // visibility changes do NOT trigger re-attach — handled in next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, scene, slotName, weapon, weaponId, debug]);

  // === Visibility effect — cheap, runs on every visible-prop change ===
  useEffect(() => {
    if (clonedRef.current) {
      clonedRef.current.visible = visible;
    }
  }, [visible]);

  return null;
}

function listObjectNames(root) {
  const names = [];
  root.traverse((o) => {
    if (o.name) names.push(o.name);
  });
  return names;
}
