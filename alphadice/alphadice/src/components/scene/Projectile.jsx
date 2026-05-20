import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// === Projectile ===
// A glowing sphere that arcs from `from` to `to` over `duration` ms.
// Position is computed every frame from elapsed time, so it stays accurate
// even if React re-renders the parent.
//
// Two visual variants: "magic_bolt" (cyan/blue) and "dark_orb" (purple).

const ARC_HEIGHT = 0.7;

const PALETTE = {
  magic_bolt: {
    core:  "#a8eaff",
    glow:  "#3fa9ff",
    light: "#5fc8ff",
  },
  dark_orb: {
    core:  "#e6b9ff",
    glow:  "#7c33d4",
    light: "#9d3ae8",
  },
};

export default function Projectile({ from, to, kind, startTs, duration }) {
  const ref = useRef();
  const glowRef = useRef();
  const palette = PALETTE[kind] || PALETTE.magic_bolt;

  useFrame(() => {
    if (!ref.current) return;
    const elapsed = Date.now() - startTs;
    const t = Math.min(elapsed / duration, 1);

    // Linear lerp + sin arc on Y
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * ARC_HEIGHT;
    const z = from[2] + (to[2] - from[2]) * t;

    ref.current.position.set(x, y, z);

    // Subtle pulse via scale on the outer glow
    if (glowRef.current) {
      const pulse = 1 + Math.sin(elapsed * 0.02) * 0.15;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={ref}>
      {/* Bright core */}
      <mesh>
        <sphereGeometry args={[0.18, 14, 14]} />
        <meshBasicMaterial color={palette.core} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshBasicMaterial
          color={palette.glow}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Cast a colored light along its path */}
      <pointLight
        intensity={2.2}
        distance={3.5}
        decay={1.8}
        color={palette.light}
      />
    </group>
  );
}
