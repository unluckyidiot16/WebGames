import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import { getNode } from "../../data/runMap";

export default function HUD() {
  const character = useGame(pickChar);
  const playerHP = useGame((s) => s.playerHP);
  const playerMaxHP = useGame((s) => s.playerMaxHP);
  const playerShield = useGame((s) => s.playerShield) || 0;
  const rerollsUsed = useGame((s) => s.rerollsUsed);
  const rerollsMax = useGame((s) => s.rerollsMax);
  const turnNumber = useGame((s) => s.turnNumber);
  const message = useGame((s) => s.message);
  const convertUsed = useGame((s) => s.convertUsed);
  const currentNodeId = useGame((s) => s.run.currentNodeId);

  const hpPct = (playerHP / playerMaxHP) * 100;
  const currentNode = getNode(currentNodeId);

  return (
    <>
      {/* Top-left: Player info */}
      <div style={styles.topLeft}>
        <div style={{ ...styles.namePlate, borderColor: character.color }}>
          <div style={{ ...styles.classBadge, background: character.color }}>
            {character.name}
          </div>
          <div style={styles.hpRow}>
            <span style={styles.hpLabel}>HP</span>
            <div style={styles.hpBar}>
              <div
                style={{
                  ...styles.hpFill,
                  width: `${hpPct}%`,
                  background: hpPct > 50 ? "#52b788" : hpPct > 25 ? "#e8b923" : "#c9302c",
                }}
              />
              <span style={styles.hpText}>
                {playerHP} / {playerMaxHP}
              </span>
            </div>
          </div>
          <div style={styles.skillRow}>
            <span style={styles.rerollChip}>
              <img src="/ui/card/die.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:4}} />리롤 {rerollsMax - rerollsUsed}/{rerollsMax}
            </span>
            {character.skill.convertOne && (
              <span
                style={{
                  ...styles.rerollChip,
                  background: convertUsed ? "#3a2a1f" : character.accentColor,
                  color: convertUsed ? "#8a7a5e" : "#1a1410",
                }}
              >
                <img src="/ui/card/magic.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:4}} />변환 {convertUsed ? "사용함" : "1회"}
              </span>
            )}
            {playerShield > 0 && (
              <span
                style={{
                  ...styles.rerollChip,
                  background: "#7ad6ff",
                  color: "#1a1410",
                }}
              >
                <img src="/ui/card/shield.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:4}} />+{playerShield}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top-right: Turn / current node */}
      <div style={styles.topRight}>
        <div style={styles.turnBox}>
          <div style={styles.turnLabel}>TURN</div>
          <div style={styles.turnNum}>{turnNumber}</div>
        </div>
        <div style={styles.encounterBox}>
          <div style={styles.encounterLabel}>
            {currentNode?.type === "boss"
              ? "BOSS"
              : currentNode?.type === "elite"
              ? "ELITE"
              : "BATTLE"}
          </div>
          <div style={styles.encounterName}>
            {currentNode?.label || ""}
          </div>
        </div>
      </div>

      {/* Enemy HP bars are now rendered in 3D space, anchored above each
          enemy's head — see Skeleton.jsx <Html>. */}

      {/* Message bar */}
      {message && (
        <div style={styles.messageBar}>
          <span>{message}</span>
        </div>
      )}
    </>
  );
}

const styles = {
  topLeft: {
    position: "absolute",
    top: "16px",
    left: "16px",
    pointerEvents: "auto",
  },
  namePlate: {
    background: "rgba(245, 235, 211, 0.95)",
    border: "3px solid",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    padding: "8px 12px",
    minWidth: "260px",
  },
  classBadge: {
    display: "inline-block",
    color: "white",
    padding: "2px 10px",
    fontFamily: "var(--font-display)",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "6px",
    border: "2px solid #1a1410",
    textShadow: "1px 1px 0 rgba(0,0,0,0.4)",
  },
  hpRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  hpLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: "11px",
    color: "#c9302c",
    width: "24px",
    fontWeight: "bold",
  },
  hpBar: {
    flex: 1,
    height: "18px",
    background: "#3a2a1f",
    border: "2px solid #1a1410",
    position: "relative",
    overflow: "hidden",
  },
  hpFill: {
    height: "100%",
    transition: "width 300ms ease",
  },
  hpText: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: "10px",
    color: "white",
    textShadow: "1px 1px 0 #000",
    fontWeight: "bold",
  },
  skillRow: {
    display: "flex",
    gap: "6px",
    marginTop: "6px",
    flexWrap: "wrap",
  },
  rerollChip: {
    background: "#e8b923",
    color: "#1a1410",
    padding: "3px 8px",
    fontFamily: "var(--font-display)",
    fontSize: "13px",
    fontWeight: "bold",
    border: "2px solid #1a1410",
  },
  topRight: {
    position: "absolute",
    top: "16px",
    right: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-end",
    pointerEvents: "auto",
  },
  turnBox: {
    background: "#1a1410",
    color: "#e8b923",
    padding: "6px 14px",
    border: "3px solid #e8b923",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    textAlign: "center",
  },
  turnLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: "10px",
    letterSpacing: "0.2em",
  },
  turnNum: {
    fontFamily: "var(--font-arcade)",
    fontSize: "24px",
    fontWeight: "bold",
    lineHeight: 1.1,
  },
  enemyCount: {
    background: "rgba(245, 235, 211, 0.95)",
    border: "3px solid #c9302c",
    padding: "4px 10px",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
  },
  encounterBox: {
    background: "rgba(245, 235, 211, 0.95)",
    border: "3px solid #1a1410",
    padding: "4px 10px",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    textAlign: "right",
    minWidth: 130,
  },
  encounterLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: "10px",
    color: "#8a7050",
    letterSpacing: "0.15em",
    fontWeight: "bold",
  },
  encounterName: {
    fontFamily: "var(--font-display)",
    fontSize: "13px",
    color: "#1a1410",
    fontWeight: "bold",
    marginTop: 1,
  },
  enemyCountText: {
    fontFamily: "var(--font-display)",
    fontSize: "15px",
    color: "#c9302c",
    fontWeight: "bold",
  },
  enemyBars: {
    position: "absolute",
    top: "30%",
    left: "50%",
    transform: "translate(-50%, 0)",
    display: "flex",
    gap: "60px",
    pointerEvents: "auto",
  },
  enemyBarSlot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  enemyHpBar: {
    width: "90px",
    height: "20px",
    background: "#1a1410",
    border: "2px solid #1a1410",
    position: "relative",
    overflow: "hidden",
  },
  enemyHpFill: {
    height: "100%",
    background: "linear-gradient(180deg, #ff5555 0%, #c9302c 100%)",
    transition: "width 300ms ease",
  },
  enemyHpText: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: "9px",
    color: "white",
    textShadow: "1px 1px 0 #000",
    fontWeight: "bold",
  },
  targetArrow: {
    fontFamily: "var(--font-arcade)",
    fontSize: "16px",
    color: "#ffd700",
    marginTop: "2px",
    textShadow: "1px 1px 0 #1a1410",
    animation: "bob 700ms ease-in-out infinite",
  },
  messageBar: {
    position: "absolute",
    top: "12%",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(26, 20, 16, 0.85)",
    color: "#f5ebd3",
    padding: "6px 16px",
    fontFamily: "var(--font-display)",
    fontSize: "16px",
    border: "2px solid #e8b923",
    pointerEvents: "none",
    maxWidth: "70%",
    textAlign: "center",
  },
};
