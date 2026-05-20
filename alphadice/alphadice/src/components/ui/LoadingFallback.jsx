export default function LoadingFallback() {
  return (
    <div style={styles.wrap}>
      <div style={styles.box}>
        <div style={styles.spinner} />
        <div style={styles.text}>모험을 준비하는 중...</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(26, 20, 16, 0.7)",
    zIndex: 100,
  },
  box: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #d4c4a0",
    borderTopColor: "#c9302c",
    borderRadius: "50%",
    animation: "spin-roll 1s linear infinite",
  },
  text: {
    fontFamily: "var(--font-display)",
    fontSize: "16px",
    color: "#f5ebd3",
  },
};
