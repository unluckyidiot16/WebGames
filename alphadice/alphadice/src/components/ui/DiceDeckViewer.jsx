import { useGame } from "../../store/gameStore";

// === DiceDeckViewer ===
// Read-only modal listing every die the player owns and the six faces on
// each one. Helps players (especially students) make informed decisions
// about whether to reroll: "if I reroll, what could come up?".
//
// The data lives in `state.diceDeck` as a 2D array of letter strings,
// one inner array per die. Re-renders cheaply since it's only mounted
// when explicitly opened.

export default function DiceDeckViewer({ onClose }) {
  const diceDeck = useGame((s) => s.diceDeck);
  const dice = useGame((s) => s.dice); // current rolled state, for "current face" highlight

  // Map dieIndex → current face so we can mark which face is currently
  // showing on each die. dieIndex matches diceDeck array index because
  // both are populated by the same character.startingDice flow.
  const currentFaceByIndex = {};
  for (const d of dice) currentFaceByIndex[d.dieIndex] = d.face;

  // Vowel highlighting helps players see distribution at a glance —
  // a die with 4 vowels is very different from one with 1.
  const isVowel = (c) => "AEIOU".includes(c);
  const isRare = (c) => "JQXZ".includes(c);

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}><img src="/ui/card/die.png" alt="" style={{width:20,height:20,verticalAlign:"middle",marginRight:6}} />내 다이스 덱</span>
          <span style={styles.subtitle}>
            총 {diceDeck.length}개 · 리롤 시 각 다이스에서 무작위 1면
          </span>
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.diceList}>
          {diceDeck.map((faces, idx) => {
            const current = currentFaceByIndex[idx];
            const vowelCount = faces.filter(isVowel).length;
            const rareCount = faces.filter(isRare).length;
            return (
              <div key={idx} style={styles.diceCard}>
                <div style={styles.diceCardHeader}>
                  <span style={styles.diceLabel}>다이스 #{idx + 1}</span>
                  <span style={styles.diceMeta}>
                    모음 {vowelCount}
                    {rareCount > 0 && ` · 희귀 ${rareCount}`}
                  </span>
                </div>
                <div style={styles.faceGrid}>
                  {faces.map((face, faceIdx) => {
                    const highlight = current === face;
                    return (
                      <div
                        key={faceIdx}
                        style={{
                          ...styles.face,
                          ...(highlight ? styles.faceCurrent : {}),
                          ...(isVowel(face) ? styles.faceVowel : {}),
                          ...(isRare(face) ? styles.faceRare : {}),
                        }}
                        title={highlight ? "지금 굴림" : undefined}
                      >
                        {face}
                        {isRare(face) && (
                          <span style={styles.rareStar}>★</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.legend}>
          <img src="/ui/card/exclamation.png" alt="" style={{width:13,height:13,verticalAlign:"middle",marginRight:4}} />모음(노랑) 많은 다이스는 안정적 · 희귀(빨강) 다이스는 강한 단어용
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,8,5,0.78)",
    // drei <Html> uses zIndexRange up to ~16,777,271 — go max int safe
    // to ensure the modal always paints over 3D-canvas overlays like
    // enemy HP bars.
    zIndex: 2147483647,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  panel: {
    background: "#1a1410",
    border: "3px solid #fce6ad",
    boxShadow: "8px 8px 0 rgba(0,0,0,0.6)",
    padding: 20,
    minWidth: 420,
    maxWidth: 720,
    maxHeight: "85vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    paddingBottom: 8,
    borderBottom: "2px solid rgba(252,230,173,0.3)",
  },
  title: {
    fontFamily: "var(--font-arcade)",
    fontSize: 16,
    color: "#fce6ad",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subtitle: {
    flex: 1,
    fontFamily: "var(--font-display)",
    fontSize: 12,
    color: "#bca480",
  },
  closeBtn: {
    background: "transparent",
    border: "2px solid #fce6ad",
    color: "#fce6ad",
    width: 32,
    height: 32,
    fontSize: 18,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  },
  diceList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  diceCard: {
    background: "rgba(252,230,173,0.05)",
    border: "1px solid rgba(252,230,173,0.25)",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  diceCardHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
  },
  diceLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    color: "#fce6ad",
    letterSpacing: 0.5,
  },
  diceMeta: {
    flex: 1,
    fontFamily: "var(--font-display)",
    fontSize: 10,
    color: "#8a7a5e",
    textAlign: "right",
  },
  faceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 6,
  },
  face: {
    position: "relative",
    aspectRatio: "1",
    background: "#f5ebd3",
    color: "#1a1410",
    border: "2px solid #1a1410",
    fontFamily: "var(--font-arcade)",
    fontSize: 22,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "1px 1px 0 rgba(0,0,0,0.4)",
  },
  faceCurrent: {
    // Outline (not border) so we don't shift layout. Gold ring matches
    // the in-game "armed" cue.
    outline: "3px solid #e8b923",
    outlineOffset: 1,
  },
  faceVowel: {
    background: "#fce6ad",
  },
  faceRare: {
    background: "#c9302c",
    color: "#fff7e0",
  },
  rareStar: {
    position: "absolute",
    top: 1,
    right: 2,
    fontSize: 9,
    color: "#fce6ad",
  },
  legend: {
    fontFamily: "var(--font-display)",
    fontSize: 11,
    color: "#8a7a5e",
    textAlign: "center",
    paddingTop: 6,
    borderTop: "1px solid rgba(252,230,173,0.15)",
  },
};
