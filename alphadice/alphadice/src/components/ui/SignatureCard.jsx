import { useGame } from "../../store/gameStore";
import { SIGNATURES } from "../../data/signatures";

// === SignatureCard ===
//
// One card at the right end of the bottom action row showing the
// player's class signature ability. Two states:
//
//   • CHARGING (gauge < max): card shows ability info dimmed plus a
//     vertical fill bar — visible progress toward the ult. Button
//     disabled; clicking does nothing.
//
//   • READY (gauge === max): card glows with a strong border + the
//     "발동" button becomes a bright call-to-action.
//
// Each letter the player spells fills the gauge by 1 (see castSkill in
// store/gameStore.js). Casting drains gauge to 0 and starts the cycle
// again — there's no per-run limit on signature uses.

export default function SignatureCard() {
  const signatureId = useGame((s) => s.signatureId);
  const gauge = useGame((s) => s.playerGauge);
  const gaugeMax = useGame((s) => s.playerGaugeMax);
  const turnState = useGame((s) => s.turnState);
  const castSignature = useGame((s) => s.castSignature);

  if (!signatureId) return null;
  const signature = SIGNATURES[signatureId];
  if (!signature) return null;

  const ready = gauge >= gaugeMax;
  const canCast = ready && turnState === "player_turn";
  const pct = Math.min(100, Math.round((gauge / gaugeMax) * 100));

  return (
    <div
      style={{
        ...styles.card,
        ...(ready ? styles.cardReady : {}),
      }}
    >
      {/* Header — name + cost indicator */}
      <div style={styles.header}>
        <img src={signature.icon} alt="" style={styles.icon} />
        <div style={styles.titleBlock}>
          <div style={styles.name}>{signature.name}</div>
          <div style={styles.subtitle}>
            {ready ? "발동 준비 완료!" : `충전 ${gauge}/${gaugeMax}`}
          </div>
        </div>
      </div>

      {/* Vertical gauge column on the left edge — visual fuel */}
      <div style={styles.gaugeOuter}>
        <div
          style={{
            ...styles.gaugeInner,
            height: `${pct}%`,
            background: ready ? "#fce6ad" : "#c9302c",
          }}
        />
      </div>

      {/* Description */}
      <div style={styles.description}>{signature.description}</div>

      {/* Cast button */}
      <button
        type="button"
        style={{
          ...styles.castBtn,
          ...(canCast ? styles.castBtnReady : styles.castBtnDisabled),
        }}
        disabled={!canCast}
        onClick={() => canCast && castSignature()}
        title={
          ready
            ? "시그니처 능력 발동"
            : `${gaugeMax - gauge}글자 더 채우면 발동 가능`
        }
      >
        {ready ? "발동!" : `${gauge} / ${gaugeMax}`}
      </button>
    </div>
  );
}

const styles = {
  card: {
    position: "relative",
    minWidth: 200,
    maxWidth: 240,
    background: "#1a1410",
    border: "3px solid #5a4a3a",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
    padding: "10px 10px 10px 22px", // extra left padding for the gauge column
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#fce6ad",
    fontFamily: "var(--font-display)",
  },
  cardReady: {
    border: "3px solid #fce6ad",
    boxShadow: "0 0 18px rgba(252,230,173,0.55), 3px 3px 0 rgba(0,0,0,0.5)",
    background: "#2a1d10",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 32,
    height: 32,
    objectFit: "contain",
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  name: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    color: "#fce6ad",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 9,
    color: "#8a7a5e",
    fontFamily: "var(--font-arcade)",
  },
  gaugeOuter: {
    position: "absolute",
    left: 6,
    top: 8,
    bottom: 8,
    width: 8,
    background: "#0d0a08",
    border: "1px solid #3a2a1f",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column-reverse", // fill from bottom up
  },
  gaugeInner: {
    width: "100%",
    transition: "height 220ms ease-out, background 200ms",
  },
  description: {
    fontSize: 10,
    color: "#d4c5a0",
    lineHeight: 1.35,
    flex: 1,
  },
  castBtn: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    padding: "6px 10px",
    border: "2px solid #1a1410",
    cursor: "pointer",
    letterSpacing: 1,
  },
  castBtnReady: {
    background: "#c9302c",
    color: "#fff7e0",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
  },
  castBtnDisabled: {
    background: "#3a2a1f",
    color: "#5a4a3a",
    cursor: "not-allowed",
    border: "2px solid #2a1f17",
  },
};
