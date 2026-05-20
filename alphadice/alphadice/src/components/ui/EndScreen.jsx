import { useGame } from "../../store/gameStore";

export default function EndScreen() {
  const phase = useGame((s) => s.phase);
  const turnNumber = useGame((s) => s.turnNumber);
  const restart = useGame((s) => s.restart);

  const won = phase === "victory";

  return (
    <div style={styles.screen}>
      <div
        style={{
          ...styles.panel,
          borderColor: won ? "#e8b923" : "#c9302c",
        }}
      >
        <div
          style={{
            ...styles.banner,
            color: won ? "#e8b923" : "#c9302c",
          }}
        >
          {won ? "★ 승리! ★" : "✘ 패배..."}
        </div>
        <div style={styles.subtitle}>
          {won ? "용감한 전사여, 단어의 힘으로 승리했다!" : "다음엔 더 강한 단어를 만들어보자."}
        </div>
        <div style={styles.stats}>
          <span style={styles.statKey}>턴 수</span>
          <span style={styles.statVal}>{turnNumber}</span>
        </div>
        <button style={styles.btn} onClick={restart}>
          다시 도전!
        </button>
      </div>
    </div>
  );
}

const styles = {
  screen: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(ellipse at center, rgba(26,20,16,0.95) 0%, rgba(0,0,0,0.95) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  panel: {
    background: "#f5ebd3",
    border: "6px solid",
    boxShadow: "10px 10px 0 rgba(0,0,0,0.6)",
    padding: "40px 50px",
    textAlign: "center",
    maxWidth: "500px",
    width: "100%",
  },
  banner: {
    fontFamily: "var(--font-arcade)",
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: "bold",
    textShadow: "4px 4px 0 #1a1410",
    marginBottom: "16px",
    letterSpacing: "0.05em",
  },
  subtitle: {
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    color: "#3a2a1f",
    marginBottom: "30px",
  },
  stats: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "30px",
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    color: "#5a4a3a",
  },
  statKey: { opacity: 0.7 },
  statVal: { fontWeight: "bold", color: "#1a1410" },
  btn: {
    background: "linear-gradient(180deg, #ff5555 0%, #c9302c 100%)",
    color: "white",
    border: "3px solid #1a1410",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
    padding: "12px 30px",
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    fontWeight: "bold",
    cursor: "pointer",
    textShadow: "2px 2px 0 rgba(0,0,0,0.4)",
  },
};
