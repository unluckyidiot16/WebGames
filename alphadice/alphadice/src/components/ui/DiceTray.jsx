import { useState, useEffect, useRef } from "react";
import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import DiceDeckViewer from "./DiceDeckViewer";

export default function DiceTray({
  armedSkillSlotId,
  setArmedSkillSlotId,
}) {
  const character = useGame(pickChar);
  const dice = useGame((s) => s.dice);
  const turnState = useGame((s) => s.turnState);
  const rerollsUsed = useGame((s) => s.rerollsUsed);
  const rerollsMax = useGame((s) => s.rerollsMax);
  const convertUsed = useGame((s) => s.convertUsed);
  const skillSlots = useGame((s) => s.skillSlots);
  const toggleLock = useGame((s) => s.toggleLock);
  const rerollAll = useGame((s) => s.rerollAll);
  const convertDie = useGame((s) => s.convertDie);
  const assignDieToSkill = useGame((s) => s.assignDieToSkill);
  const unassignDieFromSkill = useGame((s) => s.unassignDieFromSkill);

  const [convertMode, setConvertMode] = useState(false);
  const [pendingDieIndex, setPendingDieIndex] = useState(null);
  // Tracks which dieIndexes are mid-roll-animation. We increment a key per
  // die instead of remounting the whole grid so locked/used dice don't
  // also restart their visual state.
  const [rollNonce, setRollNonce] = useState(0);

  const canReroll = turnState === "player_turn" && rerollsUsed < rerollsMax;
  const canConvert =
    turnState === "player_turn" &&
    character.skill.convertOne &&
    !convertUsed;

  const handleDieClick = (die) => {
    if (turnState !== "player_turn") return;
    if (convertMode) {
      if (die.used) return;
      setPendingDieIndex(die.dieIndex);
      return;
    }
    // If this die is already in a skill slot → unassign.
    if (die.skillSlotId) {
      unassignDieFromSkill(die.dieIndex);
      return;
    }
    // A skill slot is armed → route into it.
    // Keep the slot armed afterward so the player can fire off successive
    // dice with single clicks. Re-clicking the same skill card (or clicking
    // a different one) is the explicit disarm/switch path.
    if (armedSkillSlotId && !die.used) {
      assignDieToSkill(die.dieIndex, armedSkillSlotId);
      return;
    }
    // No armed target — nothing happens (must arm a slot or drag).
  };

  const handleDieRightClick = (e, die) => {
    e.preventDefault();
    if (turnState !== "player_turn" || die.used) return;
    toggleLock(die.dieIndex);
  };

  const handleReroll = () => {
    if (!canReroll) return;
    setRollNonce((n) => n + 1);
    rerollAll();
  };

  // Dice deck viewer — read-only modal showing each die's 6 faces.
  const [deckViewerOpen, setDeckViewerOpen] = useState(false);

  const handleConvertConfirm = (letter) => {
    if (pendingDieIndex === null) return;
    convertDie(pendingDieIndex, letter);
    setPendingDieIndex(null);
    setConvertMode(false);
  };

  return (
    <div style={styles.tray} className="panel">
      {deckViewerOpen && (
        <DiceDeckViewer onClose={() => setDeckViewerOpen(false)} />
      )}
      <div style={styles.header}>
        <span style={styles.title}>다이스</span>
        <div style={styles.controls}>
          <button
            style={{
              ...styles.controlBtn,
              ...(canReroll ? {} : styles.controlBtnDisabled),
            }}
            onClick={handleReroll}
            disabled={!canReroll}
            title="잠그지 않은 다이스 모두 다시 굴리기"
          >
            <img
              src="/ui/card/die_throw.png"
              alt="리롤"
              style={{ width: 20, height: 20, verticalAlign: "middle", marginRight: 4 }}
            />
            ({rerollsMax - rerollsUsed})
          </button>
          <button
            style={styles.inspectBtn}
            onClick={() => setDeckViewerOpen(true)}
            title="내 다이스 덱 보기 — 각 다이스의 6면 미리보기"
          >
            <img
              src="/ui/card/inspect.png"
              alt="덱 보기"
              style={{ width: 20, height: 20, verticalAlign: "middle" }}
            />
          </button>
          {character.skill.convertOne && (
            <button
              style={{
                ...styles.controlBtn,
                ...(convertMode ? styles.controlBtnActive : {}),
                ...(canConvert ? {} : styles.controlBtnDisabled),
              }}
              onClick={() => canConvert && setConvertMode(!convertMode)}
              disabled={!canConvert}
              title="다이스 하나를 원하는 글자로 변환 (턴당 1회)"
            >
              <img
                src="/ui/card/magic.png"
                alt="변환"
                style={{ width: 20, height: 20, verticalAlign: "middle" }}
              />
            </button>
          )}
        </div>
      </div>

      {convertMode && pendingDieIndex === null && (
        <div style={styles.hint}>변환할 다이스를 골라!</div>
      )}

      {armedSkillSlotId && (
        <div style={{ ...styles.hint, background: "#e8b923", color: "#1a1410" }}>
          <img src="/ui/card/sword.png" alt="" style={{width:16,height:16,verticalAlign:"middle",marginRight:6}} />다이스 골라!
        </div>
      )}

      <div
        style={{
          ...styles.diceGrid,
          // 5 dice per row max — looks more readable than a 7-wide single
          // row and keeps the tray width consistent as the deck grows
          // (5 → 1 row, 6-10 → 2 rows, etc).
          gridTemplateColumns: `repeat(${Math.min(dice.length, 5)}, 1fr)`,
        }}
      >
        {dice.map((die) => (
          <DieFace
            // Re-keying per (dieIndex, rollNonce) restarts the die-roll
            // animation on each reroll for unlocked/unused dice only.
            // Locked dice get a separate jiggle animation handled inside
            // DieFace via the rollNonce prop, so their key stays stable.
            key={
              die.locked || die.used
                ? `stable-${die.dieIndex}`
                : `${die.dieIndex}-${rollNonce}`
            }
            die={die}
            rollNonce={rollNonce}
            armed={Boolean(armedSkillSlotId)}
            onClick={() => handleDieClick(die)}
            onContextMenu={(e) => handleDieRightClick(e, die)}
            convertMode={convertMode}
            disabled={turnState !== "player_turn"}
          />
        ))}
      </div>

      <div style={styles.legend}>
        스킬 클릭 → 다이스 클릭 · 드래그도 됨 · 우클릭 = 락
      </div>

      {pendingDieIndex !== null && (
        <ConvertPicker
          onPick={handleConvertConfirm}
          onCancel={() => {
            setPendingDieIndex(null);
            setConvertMode(false);
          }}
        />
      )}
    </div>
  );
}

function DieFace({
  die,
  armed,
  rollNonce,
  onClick,
  onContextMenu,
  convertMode,
  disabled,
}) {
  // Locked dice get a brief jiggle when the player rerolls, signalling
  // "I'm staying — and I noticed". A simple boolean state with a
  // setTimeout-to-clear restarts the animation reliably (React re-applies
  // the inline style, browser starts/stops the animation).
  const [jiggling, setJiggling] = useState(false);
  useEffect(() => {
    if (rollNonce > 0 && (die.locked || die.used)) {
      setJiggling(true);
      const t = setTimeout(() => setJiggling(false), 280);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollNonce]);

  // Cast-pop: when a die transitions from "not used" to "used" (i.e. the
  // player just fired a skill with it), play a quick scale-burst so the
  // moment of consumption is visible. The dice then settle into the
  // greyed-out "spent" treatment.
  const [popping, setPopping] = useState(false);
  const prevUsedRef = useRef(die.used);
  useEffect(() => {
    if (!prevUsedRef.current && die.used) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 360);
      prevUsedRef.current = die.used;
      return () => clearTimeout(t);
    }
    prevUsedRef.current = die.used;
  }, [die.used]);

  const handlePointerDown = (e) => {
    if (disabled) return;
    let pressed = false;
    const t = setTimeout(() => {
      pressed = true;
      onContextMenu({ preventDefault: () => {} });
    }, 500);
    const cancel = () => {
      clearTimeout(t);
      if (pressed) e.preventDefault();
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
    };
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
  };

  const isRare = ["J", "Q", "X", "Z"].includes(die.face);
  const isVowel = ["A", "E", "I", "O", "U"].includes(die.face);
  const isSkill = Boolean(die.skillSlotId);
  const isFree = !die.used;
  const isDraggable = !disabled && isFree;

  let bg = "#f5ebd3";
  let color = "#1a1410";
  if (isSkill) {
    bg = "#c9302c";
    color = "#fff7e0";
  } else if (die.used) {
    bg = "#3a2a1f";
    color = "#8a7a5e";
  } else if (die.locked) {
    bg = "#e8b923";
    color = "#1a1410";
  } else if (convertMode) {
    bg = "#9d7ad6";
    color = "white";
  } else if (armed) {
    bg = "#fff3c4";
    color = "#1a1410";
  } else if (isVowel) {
    bg = "#ffe5b4";
  }

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={handlePointerDown}
      disabled={disabled}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return;
        e.dataTransfer.setData("application/x-die", String(die.dieIndex));
        e.dataTransfer.effectAllowed = "move";
      }}
      title={isSkill ? "스킬에 할당됨 — 클릭으로 해제" : undefined}
      style={{
        ...styles.die,
        background: bg,
        color: color,
        cursor: isDraggable ? "grab" : disabled ? "default" : "pointer",
        borderColor: isSkill ? "#3a0a08" : die.used ? "#5a4a3a" : "#1a1410",
        outline: armed && isFree ? "2px dashed #ffd700" : "none",
        outlineOffset: "1px",
        // Animation priority (highest first):
        //   armed pulse  — overrides everything; the player is selecting
        //   pop          — die just got used by a skill cast (brief burst)
        //   jiggle       — locked/used dice signalling "I stayed put"
        //   dice-roll    — full reroll animation for fresh dice (key-based,
        //                  triggered by the key change on remount)
        animation: (() => {
          if (armed && isFree) return "pulse 800ms ease-in-out infinite";
          if (popping) return "dice-pop 360ms ease-out";
          if (jiggling) return "dice-jiggle 280ms ease-in-out";
          if (!die.used && !die.locked) {
            // Fresh roll — full physics-y animation. Runs on every
            // remount because the parent re-keys these dice on reroll.
            return "dice-roll 450ms cubic-bezier(0.34, 1.2, 0.64, 1)";
          }
          return "none";
        })(),
      }}
    >
      <span style={styles.dieLetter}>{die.face}</span>
      {isRare && !die.used && <span style={styles.rareIndicator}>★</span>}
      {die.locked && !die.used && (
        <img
          src="/ui/card/card_lock.png"
          alt="잠김"
          style={styles.lockIndicatorImg}
        />
      )}
      {isSkill && (
        <img
          src="/ui/card/sword.png"
          alt="스킬"
          style={styles.skillIndicatorImg}
        />
      )}
    </button>
  );
}

function ConvertPicker({ onPick, onCancel }) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return (
    <div style={styles.overlay}>
      <div style={styles.pickerBox}>
        <div style={styles.pickerTitle}>어떤 글자로 변환할까?</div>
        <div style={styles.lettersGrid}>
          {letters.map((l) => (
            <button
              key={l}
              style={styles.letterBtn}
              onClick={() => onPick(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <button style={styles.cancelBtn} onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}

const styles = {
  tray: {
    flex: "0 0 auto",
    minWidth: "280px",
    maxWidth: "440px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1a1410",
  },
  controls: {
    display: "flex",
    gap: "6px",
  },
  controlBtn: {
    background: "#c9302c",
    color: "white",
    border: "2px solid #1a1410",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
    padding: "4px 8px",
    fontFamily: "var(--font-display)",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  // Deck-viewer button — the inspect icon is itself a red card with a
  // magnifier, so we use a neutral parchment background instead of the
  // red controlBtn shared by reroll/convert. Cleaner read at a glance.
  inspectBtn: {
    background: "#f5ebd3",
    color: "#1a1410",
    border: "2px solid #1a1410",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
    padding: "4px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnDisabled: {
    background: "#888",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  controlBtnActive: {
    background: "#9d7ad6",
    transform: "translate(1px, 1px)",
    boxShadow: "1px 1px 0 rgba(0,0,0,0.4)",
  },
  // Skip-turn button — neutral dark gold to read as "alternate path"
  // rather than competing with the reroll's red action color.
  skipBtn: {
    background: "#5a4a3a",
    color: "#fce6ad",
    fontSize: "11px",
    letterSpacing: "0.5px",
  },
  diceGrid: {
    display: "grid",
    gap: "6px",
  },
  die: {
    aspectRatio: "1",
    border: "3px solid #1a1410",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    fontFamily: "var(--font-display)",
    fontWeight: "bold",
    position: "relative",
    transition: "transform 100ms ease, background 200ms ease",
    minWidth: "36px",
    padding: 0,
  },
  dieLetter: {
    fontSize: "clamp(20px, 4vw, 28px)",
    lineHeight: 1,
    textShadow: "1px 1px 0 rgba(255,255,255,0.4)",
  },
  rareIndicator: {
    position: "absolute",
    top: "-2px",
    right: "1px",
    fontSize: "11px",
    color: "#c9302c",
    textShadow: "1px 1px 0 white",
  },
  lockIndicator: {
    position: "absolute",
    bottom: "-2px",
    right: "1px",
    fontSize: "11px",
  },
  lockIndicatorImg: {
    position: "absolute",
    bottom: "-4px",
    right: "-2px",
    width: 16,
    height: 16,
    pointerEvents: "none",
    filter: "drop-shadow(1px 1px 0 rgba(0,0,0,0.6))",
  },
  skillIndicator: {
    position: "absolute",
    top: "-3px",
    left: "1px",
    fontSize: "11px",
    filter: "drop-shadow(1px 1px 0 rgba(0,0,0,0.6))",
  },
  skillIndicatorImg: {
    position: "absolute",
    top: "-4px",
    left: "-2px",
    width: 14,
    height: 14,
    pointerEvents: "none",
    filter: "drop-shadow(1px 1px 0 rgba(0,0,0,0.6))",
  },
  legend: {
    marginTop: "6px",
    fontFamily: "var(--font-pixel)",
    fontSize: "12px",
    color: "#8a7a5e",
    textAlign: "center",
  },
  hint: {
    background: "#9d7ad6",
    color: "white",
    padding: "4px 8px",
    fontFamily: "var(--font-display)",
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "6px",
    border: "2px solid #1a1410",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  pickerBox: {
    background: "#f5ebd3",
    border: "4px solid #1a1410",
    boxShadow: "8px 8px 0 rgba(0,0,0,0.5)",
    padding: "20px",
    maxWidth: "440px",
    width: "100%",
  },
  pickerTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    fontWeight: "bold",
    color: "#5a3a8c",
    textAlign: "center",
    marginBottom: "16px",
  },
  lettersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "6px",
    marginBottom: "16px",
  },
  letterBtn: {
    aspectRatio: "1",
    background: "#fffaed",
    border: "2px solid #1a1410",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1a1410",
    cursor: "pointer",
  },
  cancelBtn: {
    width: "100%",
    background: "#888",
    color: "white",
    border: "2px solid #1a1410",
    padding: "8px",
    fontFamily: "var(--font-display)",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
