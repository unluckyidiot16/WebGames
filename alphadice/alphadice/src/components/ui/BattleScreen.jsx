import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import BattleScene from "../scene/BattleScene";
import HUD from "./HUD";
import DiceTray from "./DiceTray";
import SkillBar from "./SkillBar";
import SignatureCard from "./SignatureCard";
import InventoryModal from "./InventoryModal";
import LoadingFallback from "./LoadingFallback";

export default function BattleScreen() {
  const character = useGame(pickChar);
  // Skill slot armed for click-to-fill (drag-and-drop also works directly).
  const [armedSkillSlotId, setArmedSkillSlotId] = useState(null);
  const [cameraMode, setCameraMode] = useState("iso");
  // Inventory grid modal — opens an overlay showing the loadout layout.
  // Read-only in Phase 2; editable in Phase 3 (reward/rearrange screen).
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // Disarm whenever it's no longer the player's turn.
  const turnState = useGame((s) => s.turnState);
  useEffect(() => {
    if (turnState !== "player_turn" && armedSkillSlotId !== null) {
      setArmedSkillSlotId(null);
    }
  }, [turnState, armedSkillSlotId]);

  if (!character) return null;

  return (
    <div className="screen">
      <div className="canvas-container">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <BattleScene cameraMode={cameraMode} />
          </Suspense>
        </Canvas>
      </div>

      <FloatingTextLayer />
      <HUD />
      <CameraToggle mode={cameraMode} onChange={setCameraMode} />
      <InventoryToggle onClick={() => setInventoryOpen(true)} />

      {/* Bottom action panel — single row: dice | skill cards | end-turn */}
      <div style={styles.actionPanel}>
        <div style={styles.actionRow}>
          <DiceTray
            armedSkillSlotId={armedSkillSlotId}
            setArmedSkillSlotId={setArmedSkillSlotId}
          />
          <SkillBar
            armedSkillSlotId={armedSkillSlotId}
            setArmedSkillSlotId={setArmedSkillSlotId}
          />
          <SignatureCard />
          <EndTurnButton />
        </div>
      </div>

      {inventoryOpen && (
        <InventoryModal onClose={() => setInventoryOpen(false)} />
      )}
    </div>
  );
}

function FloatingTextLayer() {
  const texts = useGame((s) => s.floatingTexts);
  const enemies = useGame((s) => s.enemies);

  // Map anchor → screen position estimate
  const anchorPos = {
    player: { left: "15%", top: "55%" },
    word: { left: "50%", top: "70%" },
  };
  enemies.forEach((e, i) => {
    const totalCount = enemies.length;
    const spread = 220; // px on each side
    const xPct = 50 + ((i - (totalCount - 1) / 2) * spread) / window.innerWidth * 100;
    anchorPos[e.id] = { left: `${xPct}%`, top: "40%" };
  });

  return (
    <div style={styles.floatLayer}>
      {texts.map((t) => {
        const pos = anchorPos[t.anchor] || { left: "50%", top: "50%" };
        return (
          <div
            key={t.id}
            style={{
              ...styles.floatText,
              left: pos.left,
              top: pos.top,
              color: t.color,
            }}
          >
            {t.text}
          </div>
        );
      })}
    </div>
  );
}

// Floating camera-mode toggle. Position: under the turn indicator on the
// top-right, far enough from the dice tray that you don't hit it by
// accident. Two-button segmented control for clarity.
function CameraToggle({ mode, onChange }) {
  return (
    <div style={cameraToggleStyles.wrap}>
      <button
        style={{
          ...cameraToggleStyles.btn,
          ...(mode === "iso" ? cameraToggleStyles.btnActive : {}),
        }}
        onClick={() => onChange("iso")}
        title="기본 시점 (위에서)"
      >
        <img src="/ui/card/aim.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:4}} />위
      </button>
      <button
        style={{
          ...cameraToggleStyles.btn,
          ...(mode === "behind" ? cameraToggleStyles.btnActive : {}),
        }}
        onClick={() => onChange("behind")}
        title="3인칭 시점 (캐릭터 뒤)"
      >
        🎥 뒤
      </button>
    </div>
  );
}

// Inventory grid toggle — opens a read-only view of the current loadout's
// grid arrangement. Same visual language as CameraToggle: bottom-anchored,
// pixel-arcade style.
function InventoryToggle({ onClick }) {
  return (
    <button
      style={inventoryToggleStyles.btn}
      onClick={onClick}
      title="인벤토리 — 스킬 그리드 배치 확인"
    >
      <img src="/ui/card/bag.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:4}} />인벤토리
    </button>
  );
}

// End-turn button — the explicit "commit my actions for this turn and
// hand off to enemies" action. Previously this lived in the dice tray
// header as a small "턴 넘기기" button, but multi-cast turns demand a
// prominent, unambiguous end-of-turn UI.
//
// Option A layout: lives inside the bottom actionRow as the rightmost
// card. It's a square button that stretches to match dice/skill card
// height via flexbox `align-items: stretch` (default on the actionRow).
function EndTurnButton() {
  const turnState = useGame((s) => s.turnState);
  const skipTurn = useGame((s) => s.skipTurn);
  const enabled = turnState === "player_turn";
  return (
    <button
      style={{
        ...endTurnBtnStyles.btn,
        ...(enabled ? {} : endTurnBtnStyles.btnDisabled),
      }}
      onClick={() => enabled && skipTurn()}
      disabled={!enabled}
      title="이번 턴 종료 — 적이 행동합니다"
    >
      <img
        src="/ui/card/right.png"
        alt=""
        style={{ width: 28, height: 28 }}
      />
      <div style={endTurnBtnStyles.label}>
        턴<br />종료
      </div>
    </button>
  );
}

const endTurnBtnStyles = {
  btn: {
    // Square card matching dice/skill card heights; aspect-ratio keeps
    // it close to a square regardless of actual flex height.
    aspectRatio: "1 / 1",
    minWidth: 96,
    background: "#c9302c",
    color: "#fff7e0",
    border: "3px solid #1a1410",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontFamily: "var(--font-arcade)",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  btnDisabled: {
    background: "#5a4a3a",
    color: "#8a7a5e",
    cursor: "not-allowed",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
  },
  label: {
    fontSize: 14,
    lineHeight: 1.15,
    textAlign: "center",
  },
};

const inventoryToggleStyles = {
  btn: {
    position: "absolute",
    top: "240px",        // sits below the CameraToggle's two buttons
    right: "12px",
    background: "#1a1410",
    color: "#fce6ad",
    border: "2px solid #fce6ad",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    padding: "5px 10px",
    fontFamily: "var(--font-arcade)",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
    minWidth: 84,
    letterSpacing: 0.5,
    pointerEvents: "auto",
    zIndex: 50,
  },
};

const cameraToggleStyles = {
  wrap: {
    position: "absolute",
    top: "168px",   // sits below the HUD's TURN + encounter boxes
    right: "12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    pointerEvents: "auto",
    zIndex: 50,
  },
  btn: {
    background: "#1a1410",
    color: "#fce6ad",
    border: "2px solid #fce6ad",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    padding: "5px 10px",
    fontFamily: "var(--font-arcade)",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
    minWidth: 64,
    letterSpacing: 0.5,
  },
  btnActive: {
    background: "#e8b923",
    color: "#1a1410",
    boxShadow: "1px 1px 0 rgba(0,0,0,0.5)",
    transform: "translate(1px, 1px)",
  },
};

const styles = {
  actionPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "8px 12px 12px",
    pointerEvents: "none",
  },
  actionRow: {
    maxWidth: "1600px",
    margin: "0 auto",
    display: "flex",
    gap: "12px",
    alignItems: "stretch",
    pointerEvents: "auto",
  },
  floatLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  floatText: {
    position: "absolute",
    transform: "translate(-50%, 0)",
    fontFamily: "var(--font-arcade)",
    fontSize: "26px",
    fontWeight: "bold",
    textShadow: "3px 3px 0 #1a1410",
    animation: "float-up 1.5s ease-out forwards",
  },
};
