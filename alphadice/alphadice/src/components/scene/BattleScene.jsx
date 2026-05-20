import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import Arena from "./Arena";
import PlayerCharacter from "./PlayerCharacter";
import Skeleton from "./Skeleton";
import Projectile from "./Projectile";

// === World anchor positions (kept in one place) ===
// Projectiles spawn/aim from chest-height (~1.4) rather than feet (0).
const PLAYER_POS = [-3.8, 0, 1];
const PLAYER_CHEST = [-3.8, 1.4, 1];
const ENEMY_CHEST_Y = 1.4;

// === Camera presets ===
// `iso` — overhead-front isometric, pulled back for the larger room.
// `behind` — third-person, camera behind the player looking past them
//   toward the enemy line. Player is on -X, faces +X. Setting the camera
//   further in -X with elevation gives an over-shoulder view.
export const CAMERA_PRESETS = {
  iso: {
    // Pulled in & raised so the smaller square dungeon fits cleanly.
    position: [0, 11, 11],
    target: [0, 0.5, 0],
    fov: 50,
  },
  behind: {
    // Tightened — walls used to be ~24u away on the right; now ~10u.
    position: [-6, 3.5, 3.5],
    target: [2, 1.2, -0.5],
    fov: 55,
  },
};

function enemyChestPos(enemy) {
  return [enemy.x, ENEMY_CHEST_Y, enemy.z ?? -0.5];
}

// CameraRig — smoothly interpolates between presets. Lives inside the
// Canvas so it has access to useFrame.
function CameraRig({ mode }) {
  const camRef = useRef();
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const lookAtHelper = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!camRef.current) return;
    const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.iso;
    desiredPos.current.set(...preset.position);
    desiredTarget.current.set(...preset.target);

    // Lerp position. 0.08 per frame ≈ 80%-of-the-way in ~0.4s at 60fps.
    camRef.current.position.lerp(desiredPos.current, 0.08);

    // Lerp the look-at target rather than lerping orientation directly —
    // simpler and avoids quaternion mid-flight ambiguity.
    lookAtHelper.current.lerp(desiredTarget.current, 0.08);
    camRef.current.lookAt(lookAtHelper.current);

    // Lerp FoV separately so wide↔narrow transitions are smooth too.
    if (Math.abs(camRef.current.fov - preset.fov) > 0.05) {
      camRef.current.fov = THREE.MathUtils.lerp(
        camRef.current.fov,
        preset.fov,
        0.08
      );
      camRef.current.updateProjectionMatrix();
    }
  });

  const initial = CAMERA_PRESETS[mode] || CAMERA_PRESETS.iso;
  return (
    <PerspectiveCamera
      ref={camRef}
      makeDefault
      position={initial.position}
      fov={initial.fov}
      near={0.1}
      far={100}
    />
  );
}

export default function BattleScene({ cameraMode = "iso" }) {
  const character = useGame(pickChar);
  const enemies = useGame((s) => s.enemies);
  const targetIndex = useGame((s) => s.targetIndex);
  const projectiles = useGame((s) => s.projectiles);

  // Map enemy.id → world chest position, so projectiles can resolve their
  // "from" anchor at spawn time even if the enemy moves later.
  const enemyPosById = {};
  enemies.forEach((e) => {
    enemyPosById[e.id] = enemyChestPos(e);
  });

  return (
    <>
      <CameraRig mode={cameraMode} />

      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <hemisphereLight args={["#d4e4f5", "#8a6d3b", 0.4]} />
      <fog attach="fog" args={["#1a1410", 15, 30]} />

      {/* Arena */}
      <Arena cameraMode={cameraMode} />

      {/* Player on left, facing right toward enemies */}
      <PlayerCharacter
        character={character}
        position={PLAYER_POS}
      />

      {/* Enemies on right, facing left toward player */}
      {enemies.map((e) => (
        <Skeleton
          key={e.id}
          enemy={e}
          isTarget={targetIndex === enemies.findIndex((x) => x.id === e.id)}
          position={[e.x, 0, e.z ?? -0.5]}
        />
      ))}

      {/* Target indicator ring at world scale */}
      {enemies.map((e, i) => {
        if (!e.alive || targetIndex !== i) return null;
        return (
          <mesh
            key={`ring_${e.id}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[e.x, 0.04, e.z ?? -0.5]}
          >
            <ringGeometry args={[0.55, 0.78, 32]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.85} />
          </mesh>
        );
      })}

      {/* Active projectiles */}
      {projectiles.map((p) => {
        const from = p.from === "player" ? PLAYER_CHEST : enemyPosById[p.from];
        const to   = p.to   === "player" ? PLAYER_CHEST : enemyPosById[p.to];
        // Skip if anchor missing (e.g. enemy died mid-flight); sequence
        // will despawn it on impact anyway, this just avoids a frame crash.
        if (!from || !to) return null;
        return (
          <Projectile
            key={p.id}
            from={from}
            to={to}
            kind={p.kind}
            startTs={p.startTs}
            duration={p.duration}
          />
        );
      })}

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={24}
        blur={2}
        far={3}
      />
    </>
  );
}
