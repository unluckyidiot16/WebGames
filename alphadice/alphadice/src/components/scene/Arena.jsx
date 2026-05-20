import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

// === KayKit Dungeon Modular Kit ===
//
// Piece measurements (verified):
//   floor_tile_small : 2 × 2 (pivot at top center, y ∈ [-0.1, 0.05])
//   wall             : 4 × 4 × 1 (pivot at bottom center, default faces +z)
//   pillar_decorated : 2.2 × 4 × 1.7 (pivot at bottom center)
//   torch_lit        : 0.6 × 1.1 (pivot middle)
//   chest_gold       : 1.7 × 1.0 × 1.4
//   banner_brown     : 1.5 × 3.2 (pivot top, hangs down)
//
// Layout: 9×5 floor grid (18×10 unit room). Roomy enough that the
// behind-the-character camera doesn't clip into the side walls, and
// future "dash to enemy" attack motions have room to play.
//
// Coord conventions: player is at x=-3.8 facing +x. Enemies are around
// x=1..4 facing -x. So the room is wider along x than z by design.

const PIECES = {
  floor:   "/models/dungeon/floor_tile_small.gltf",
  wall:    "/models/dungeon/wall.gltf",
  wallGated:   "/models/dungeon/wall_gated.gltf",       // iron prison-bar gate
  wallDoorway: "/models/dungeon/wall_doorway.gltf",     // wooden door
  wallDoorwayT:"/models/dungeon/wall_doorway_Tsplit.gltf", // 8-wide T-split passage
  pillar:  "/models/dungeon/pillar_decorated.gltf",
  torch:   "/models/dungeon/torch_lit.gltf",
  banner:  "/models/dungeon/banner_brown.gltf",
  chest:   "/models/dungeon/chest_gold.gltf",
  coins:   "/models/dungeon/coin_stack_small.gltf",
  rubble:  "/models/dungeon/rubble_large.gltf",
  barrel:  "/models/dungeon/barrel_large.gltf",
};

// Preload all
Object.values(PIECES).forEach((p) => useGLTF.preload(p));

// === Room dimensions (single source of truth) ===
// Square dungeon: 20u × 20u. Each wall is 5 wall pieces wide
// (solid 2 + doorway 1 + solid 2). The doorway sits dead-center.
const FLOOR_X = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9];   // 10 columns × 2u = 20u
const FLOOR_Z = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9];   // 10 rows × 2u = 20u
const BACK_WALL_Z = -10.5;
const FRONT_WALL_Z = 10.5;
const LEFT_WALL_X = -10.5;
const RIGHT_WALL_X = 10.5;

// === Generic static piece — clones the loaded GLB scene per instance ===

function StaticPiece({ path, position, rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return (
    <primitive
      object={cloned}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

// === Composition ===

export default function Arena({ cameraMode = "iso" }) {
  // Front wall is hidden in iso view (sits between camera and action).
  // Doors are always visible in both views — they're embedded in the walls.
  const frontWallVisible = cameraMode !== "iso";

  return (
    <group>
      <BaseGround />
      <Floor />
      <Walls frontVisible={frontWallVisible} />
      <Pillars frontVisible={frontWallVisible} />
      <Torches frontVisible={frontWallVisible} />
      <Arena_Decorations frontVisible={frontWallVisible} />
    </group>
  );
}

// Dark base plane extending past the visible floor — covers peek-through.
function BaseGround() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.06, 0]}
      receiveShadow
    >
      <planeGeometry args={[100, 40]} />
      <meshStandardMaterial color="#1a1410" roughness={1} />
    </mesh>
  );
}

function Floor() {
  const tiles = useMemo(() => {
    const ts = [];
    for (const x of FLOOR_X) {
      for (const z of FLOOR_Z) {
        ts.push({ x, z });
      }
    }
    return ts;
  }, []);

  return (
    <>
      {tiles.map(({ x, z }, i) => (
        <StaticPiece
          key={`tile_${i}`}
          path={PIECES.floor}
          position={[x, -0.05, z]}
        />
      ))}
    </>
  );
}

function Walls({ frontVisible }) {
  // Each wall is 5 pieces wide. Solid pieces flank the doorway.
  // Pattern per wall: solid(-8), solid(-4), DOORWAY(0), solid(+4), solid(+8)
  const solidOffsets = [-8, -4, 4, 8];

  return (
    <>
      {/* === BACK WALL (z = BACK_WALL_Z, faces +z) === */}
      {solidOffsets.map((x) => (
        <StaticPiece
          key={`bw_${x}`}
          path={PIECES.wall}
          position={[x, 0, BACK_WALL_Z]}
        />
      ))}
      <StaticPiece
        path={PIECES.wallDoorway}
        position={[0, 0, BACK_WALL_Z]}
      />

      {/* === FRONT WALL (z = FRONT_WALL_Z, faces -z) === */}
      <group visible={frontVisible}>
        {solidOffsets.map((x) => (
          <StaticPiece
            key={`fw_${x}`}
            path={PIECES.wall}
            position={[x, 0, FRONT_WALL_Z]}
            rotation={[0, Math.PI, 0]}
          />
        ))}
        <StaticPiece
          path={PIECES.wallDoorway}
          position={[0, 0, FRONT_WALL_Z]}
          rotation={[0, Math.PI, 0]}
        />
      </group>

      {/* === LEFT WALL (x = LEFT_WALL_X, faces +x) === */}
      {solidOffsets.map((z) => (
        <StaticPiece
          key={`lw_${z}`}
          path={PIECES.wall}
          position={[LEFT_WALL_X, 0, z]}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}
      <StaticPiece
        path={PIECES.wallDoorway}
        position={[LEFT_WALL_X, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* === RIGHT WALL (x = RIGHT_WALL_X, faces -x) === */}
      {solidOffsets.map((z) => (
        <StaticPiece
          key={`rw_${z}`}
          path={PIECES.wall}
          position={[RIGHT_WALL_X, 0, z]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      ))}
      <StaticPiece
        path={PIECES.wallDoorway}
        position={[RIGHT_WALL_X, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </>
  );
}

function Pillars({ frontVisible }) {
  return (
    <>
      {/* Back corners */}
      <StaticPiece path={PIECES.pillar} position={[LEFT_WALL_X + 0.5, 0, BACK_WALL_Z + 0.5]} />
      <StaticPiece path={PIECES.pillar} position={[RIGHT_WALL_X - 0.5, 0, BACK_WALL_Z + 0.5]} />
      {/* Front corners — fade with front wall in iso view */}
      <group visible={frontVisible}>
        <StaticPiece path={PIECES.pillar} position={[LEFT_WALL_X + 0.5, 0, FRONT_WALL_Z - 0.5]} />
        <StaticPiece path={PIECES.pillar} position={[RIGHT_WALL_X - 0.5, 0, FRONT_WALL_Z - 0.5]} />
      </group>
    </>
  );
}

function MountedTorch({ position }) {
  return (
    <group position={position}>
      <StaticPiece path={PIECES.torch} position={[0, 0, 0]} />
      <pointLight
        position={[0, 0.3, 0.3]}
        intensity={1.2}
        distance={7}
        decay={1.5}
        color="#ffa54a"
        castShadow={false}
      />
    </group>
  );
}

function Torches({ frontVisible }) {
  return (
    <>
      {/* Back wall — two torches flanking the doorway */}
      <MountedTorch position={[-6, 2.6, BACK_WALL_Z + 0.4]} />
      <MountedTorch position={[6, 2.6, BACK_WALL_Z + 0.4]} />

      {/* Left/Right walls — same flanking pattern */}
      <MountedTorch position={[LEFT_WALL_X + 0.4, 2.6, -6]} />
      <MountedTorch position={[LEFT_WALL_X + 0.4, 2.6, 6]} />
      <MountedTorch position={[RIGHT_WALL_X - 0.4, 2.6, -6]} />
      <MountedTorch position={[RIGHT_WALL_X - 0.4, 2.6, 6]} />

      {/* Front wall — fades with front wall in iso */}
      <group visible={frontVisible}>
        <MountedTorch position={[-6, 2.6, FRONT_WALL_Z - 0.4]} />
        <MountedTorch position={[6, 2.6, FRONT_WALL_Z - 0.4]} />
      </group>
    </>
  );
}

function Arena_Decorations({ frontVisible }) {
  return (
    <>
      {/* Banners flanking the back doorway */}
      <StaticPiece path={PIECES.banner} position={[-3, 0.4, BACK_WALL_Z + 0.3]} />
      <StaticPiece path={PIECES.banner} position={[3, 0.4, BACK_WALL_Z + 0.3]} />

      {/* --- BACK CORNER (chest cluster — always visible) --- */}
      <StaticPiece
        path={PIECES.chest}
        position={[-8.5, 0, BACK_WALL_Z + 1.5]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <StaticPiece path={PIECES.coins} position={[-8, 0, BACK_WALL_Z + 1.2]} />

      {/* Back-wall barrels flanking corners (between corners and torches) */}
      <StaticPiece path={PIECES.barrel} position={[8.5, 0, BACK_WALL_Z + 1]} />
      <StaticPiece path={PIECES.barrel} position={[8.7, 0, BACK_WALL_Z + 2.5]} scale={0.85} />

      {/* --- FRONT PROPS (fade with front wall in iso) --- */}
      <group visible={frontVisible}>
        <StaticPiece path={PIECES.barrel} position={[-8.7, 0, FRONT_WALL_Z - 1]} />
        <StaticPiece path={PIECES.barrel} position={[-8.5, 0, FRONT_WALL_Z - 2.5]} scale={0.85} />
        <StaticPiece path={PIECES.barrel} position={[8.5, 0, FRONT_WALL_Z - 1]} />
        <StaticPiece path={PIECES.barrel} position={[8.7, 0, FRONT_WALL_Z - 2.5]} scale={0.85} />
      </group>
    </>
  );
}
