import { useState } from "react";
import { useGame } from "../../store/gameStore";
import { CHARACTERS, CHARACTER_ORDER } from "../../data/characters";
import {
  loadProfile,
  isCharacterUnlocked,
  winsNeededToUnlock,
  CHARACTER_UNLOCK_ORDER,
} from "../../utils/profile";
import { getSetting, updateSetting } from "../../utils/settings";

export default function CharacterSelect() {
  const selectCharacter = useGame((s) => s.selectCharacter);
  const [hoverId, setHoverId] = useState(null);
  // Read profile on mount. Since this screen only mounts on "select" phase
  // (i.e. fresh page, restart from victory, or restart from defeat), a
  // one-time read at render is fine — no need to react to changes.
  const profile = loadProfile();
  const totalWins = profile.totalVictories || 0;

  // Sort characters into [order] so the unlock progression reads
  // naturally left-to-right. CHARACTER_UNLOCK_ORDER drives the unlock
  // gating; we render in the same order.
  const orderedIds = CHARACTER_UNLOCK_ORDER.filter((id) => CHARACTERS[id]);
  // Fallback: if some character isn't in unlock order yet, tack it on.
  for (const id of CHARACTER_ORDER) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }

  return (
    <div className="screen" style={styles.screen}>
      <BackgroundDecoration />

      <div style={styles.titleWrap}>
        <h1 style={styles.title}>
          알파다이스
        </h1>
        <h2 style={styles.subtitle}>ALPHADICE ARENA</h2>
        <p style={styles.tagline}>
          다이스를 굴리고, 단어를 만들어, 적을 쓰러뜨려라.
        </p>
        <div style={styles.profileBadge}>
          <img src="/ui/card/crown.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:6}} />총 클리어 {totalWins}회
        </div>
        <SettingsPanel />
      </div>

      <div style={styles.cardRow}>
        {orderedIds.map((id) => {
          const c = CHARACTERS[id];
          const active = hoverId === id;
          const unlocked = isCharacterUnlocked(id, profile);
          const winsNeeded = winsNeededToUnlock(id, profile);
          return (
            <button
              key={id}
              onClick={() => unlocked && selectCharacter(id)}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId(null)}
              onTouchStart={() => setHoverId(id)}
              disabled={!unlocked}
              style={{
                ...styles.card,
                borderColor: unlocked ? c.color : "#5a4a3a",
                cursor: unlocked ? "pointer" : "default",
                opacity: unlocked ? 1 : 0.55,
                filter: unlocked ? "none" : "grayscale(0.7)",
                transform:
                  unlocked && active ? "translateY(-8px)" : "translateY(0)",
                boxShadow: unlocked
                  ? active
                    ? `8px 8px 0 ${c.color}, 8px 8px 0 4px rgba(0,0,0,0.8)`
                    : `6px 6px 0 ${c.color}, 6px 6px 0 4px rgba(0,0,0,0.7)`
                  : "4px 4px 0 rgba(0,0,0,0.6)",
              }}
            >
              <div
                style={{
                  ...styles.cardBanner,
                  background: unlocked ? c.color : "#5a4a3a",
                }}
              >
                <span style={styles.cardName}>{c.name}</span>
                <span style={styles.cardNameEn}>{c.nameEn}</span>
              </div>

              <CharacterAvatar character={c} />

              <div style={styles.cardBody}>
                <div style={styles.tagline2}>{c.tagline}</div>
                <p style={styles.cardDesc}>{c.description}</p>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>HP</span>
                  <div style={styles.hpBar}>
                    <div
                      style={{
                        ...styles.hpFill,
                        width: `${(c.hp / 40) * 100}%`,
                        background: c.color,
                      }}
                    />
                  </div>
                  <span style={styles.statValue}>{c.hp}</span>
                </div>

                <div style={{ ...styles.skillBox, borderColor: c.accentColor }}>
                  <div style={styles.skillName}>★ {c.skill.name}</div>
                  <div style={styles.skillDesc}>{c.skill.description}</div>
                </div>

                <DicePreview dice={c.startingDice} />
              </div>

              {unlocked ? (
                <div style={{ ...styles.selectBtn, background: c.color }}>
                  선택!
                </div>
              ) : (
                <div style={styles.lockBtn}>
                  <img src="/ui/card/card_lock.png" alt="" style={{width:14,height:14,verticalAlign:"middle",marginRight:6}} />{winsNeeded}회 더 클리어 시 해금
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={styles.footer}>
        제작 by 댕청이 · 영어 단어로 싸우는 턴제 RPG
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [open, setOpen] = useState(false);
  // Read settings once on mount; updates re-render via local state below.
  const [autoSkip, setAutoSkip] = useState(() => getSetting("autoSkipEmptyTurn"));

  function toggleAutoSkip() {
    const next = !autoSkip;
    setAutoSkip(next);
    updateSetting("autoSkipEmptyTurn", next);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={settingsStyles.toggleBtn}
        title="게임 설정"
      >
        ⚙ 설정
      </button>
    );
  }
  return (
    <div style={settingsStyles.panel}>
      <div style={settingsStyles.header}>
        <span style={settingsStyles.title}>⚙ 설정</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={settingsStyles.closeBtn}
        >
          ×
        </button>
      </div>
      <div style={settingsStyles.row}>
        <label style={settingsStyles.label}>
          <input
            type="checkbox"
            checked={autoSkip}
            onChange={toggleAutoSkip}
            disabled={true /* MVP: opted out — implementation pending */}
            style={settingsStyles.checkbox}
          />
          <span>
            사용 가능한 스킬 없을 때 자동 턴 스킵
            <span style={settingsStyles.upcomingTag}>예정</span>
          </span>
        </label>
        <div style={settingsStyles.hint}>
          MVP에선 비활성. 조건 검증 안정화 후 활성 예정.
        </div>
      </div>
    </div>
  );
}

const settingsStyles = {
  toggleBtn: {
    marginTop: 8,
    background: "transparent",
    color: "#8a7a5e",
    border: "1px solid #5a4a3a",
    padding: "4px 12px",
    fontFamily: "var(--font-display)",
    fontSize: 11,
    cursor: "pointer",
  },
  panel: {
    marginTop: 8,
    width: 360,
    background: "#1a1410",
    border: "2px solid #fce6ad",
    padding: 10,
    boxShadow: "3px 3px 0 rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottom: "1px solid rgba(252,230,173,0.25)",
    marginBottom: 8,
  },
  title: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    color: "#fce6ad",
  },
  closeBtn: {
    background: "transparent",
    color: "#fce6ad",
    border: "1px solid #fce6ad",
    width: 22,
    height: 22,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "var(--font-display)",
    fontSize: 11,
    color: "#fce6ad",
    cursor: "default",
    opacity: 0.55, // dimmed because the option is currently disabled
  },
  checkbox: {
    width: 14,
    height: 14,
  },
  upcomingTag: {
    marginLeft: 6,
    fontSize: 9,
    background: "#c9302c",
    color: "#fff7e0",
    padding: "1px 5px",
    fontFamily: "var(--font-arcade)",
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: "var(--font-display)",
    fontSize: 10,
    color: "#5a4a3a",
    fontStyle: "italic",
    marginLeft: 22,
  },
};

function BackgroundDecoration() {
  return (
    <div style={styles.bgWrap}>
      <div style={styles.bgGrid} />
      <div style={styles.bgVignette} />
    </div>
  );
}

function CharacterAvatar({ character }) {
  // Display the class portrait image. Portraits live under
  // /ui/portrait/<Color>_<Class>_Badge.png and are defined per-character
  // in characters.js. Falls back to a class-colored circle if missing.
  const c = character;
  if (!c.portrait) {
    return (
      <div
        style={{
          ...styles.avatarBox,
          background: c.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontFamily: "var(--font-arcade)",
          fontSize: 24,
        }}
      >
        {c.nameEn?.[0] || "?"}
      </div>
    );
  }
  return (
    <div style={styles.avatarBox}>
      <img
        src={c.portrait}
        alt={c.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}


function DicePreview({ dice }) {
  // Show a small preview of which letters are most likely to appear
  // Count letter frequency across all dice faces
  const counts = {};
  dice.forEach((sides) => sides.forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div style={styles.preview}>
      <div style={styles.previewLabel}>자주 나오는 글자</div>
      <div style={styles.previewLetters}>
        {sorted.map(([letter, count]) => (
          <span key={letter} style={{ ...styles.previewLetter, opacity: 0.5 + count * 0.06 }}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  screen: {
    background: "radial-gradient(ellipse at center, #3a2a1f 0%, #1a1410 100%)",
    padding: "20px",
    overflowY: "auto",
  },
  bgWrap: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(212, 196, 160, 0.04) 39px, rgba(212, 196, 160, 0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(212, 196, 160, 0.04) 39px, rgba(212, 196, 160, 0.04) 40px)",
  },
  bgVignette: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
  },
  titleWrap: {
    textAlign: "center",
    paddingTop: "30px",
    paddingBottom: "20px",
    position: "relative",
    zIndex: 1,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(48px, 8vw, 88px)",
    color: "#f5ebd3",
    textShadow: "4px 4px 0 #c9302c, 8px 8px 0 #1a1410",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  },
  subtitle: {
    fontFamily: "var(--font-arcade)",
    fontSize: "clamp(12px, 2vw, 18px)",
    color: "#e8b923",
    letterSpacing: "0.2em",
    marginBottom: "12px",
  },
  tagline: {
    fontFamily: "var(--font-display)",
    fontSize: "16px",
    color: "#d4c4a0",
    opacity: 0.9,
  },
  profileBadge: {
    display: "inline-block",
    marginTop: "12px",
    padding: "6px 14px",
    fontFamily: "var(--font-arcade)",
    fontSize: "12px",
    color: "#1a1410",
    background: "#e8b923",
    border: "2px solid #1a1410",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
    letterSpacing: "0.1em",
  },
  cardRow: {
    display: "flex",
    gap: "24px",
    justifyContent: "center",
    flexWrap: "wrap",
    padding: "20px",
    position: "relative",
    zIndex: 1,
  },
  card: {
    width: "240px",
    background: "#f5ebd3",
    border: "4px solid",
    padding: "0",
    cursor: "pointer",
    transition: "transform 180ms ease, box-shadow 180ms ease",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  cardBanner: {
    padding: "12px",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderBottom: "3px solid #1a1410",
  },
  cardName: {
    fontFamily: "var(--font-display)",
    fontSize: "28px",
    fontWeight: "bold",
    textShadow: "2px 2px 0 rgba(0,0,0,0.4)",
  },
  cardNameEn: {
    fontFamily: "var(--font-arcade)",
    fontSize: "11px",
    opacity: 0.85,
    letterSpacing: "0.15em",
    marginTop: "2px",
  },
  avatarBox: {
    width: "100%",
    height: "200px",
    background: "#1a1410",
    borderBottom: "3px solid #1a1410",
    overflow: "hidden",
  },
  cardBody: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  tagline2: {
    fontFamily: "var(--font-arcade)",
    fontSize: "10px",
    color: "#8a7a5e",
    letterSpacing: "0.1em",
    textAlign: "center",
  },
  cardDesc: {
    fontFamily: "var(--font-display)",
    fontSize: "14px",
    color: "#3a2a1f",
    lineHeight: 1.4,
    minHeight: "42px",
  },
  statRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "var(--font-arcade)",
    fontSize: "11px",
  },
  statLabel: { width: "24px", color: "#1a1410" },
  hpBar: {
    flex: 1,
    height: "12px",
    background: "#3a2a1f",
    border: "2px solid #1a1410",
  },
  hpFill: { height: "100%" },
  statValue: { width: "30px", textAlign: "right", color: "#1a1410" },
  skillBox: {
    background: "#fffaed",
    border: "2px solid",
    padding: "8px",
  },
  skillName: {
    fontFamily: "var(--font-display)",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#3a2a1f",
    marginBottom: "2px",
  },
  skillDesc: {
    fontFamily: "var(--font-display)",
    fontSize: "13px",
    color: "#5a4a3a",
    lineHeight: 1.3,
  },
  preview: {
    background: "#1a1410",
    color: "#f5ebd3",
    padding: "6px 8px",
  },
  previewLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: "9px",
    color: "#c4b797",
    marginBottom: "4px",
    letterSpacing: "0.1em",
  },
  previewLetters: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    justifyContent: "center",
  },
  previewLetter: {
    fontFamily: "var(--font-arcade)",
    fontSize: "14px",
    color: "#e8b923",
    fontWeight: "bold",
  },
  selectBtn: {
    padding: "12px",
    color: "white",
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
    borderTop: "3px solid #1a1410",
    textShadow: "2px 2px 0 rgba(0,0,0,0.4)",
  },
  lockBtn: {
    padding: "12px",
    color: "#bca480",
    fontFamily: "var(--font-display)",
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center",
    borderTop: "3px solid #1a1410",
    background: "#3a2a1f",
    letterSpacing: "0.05em",
  },
  footer: {
    textAlign: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: "10px",
    color: "#8a7a5e",
    padding: "20px",
    letterSpacing: "0.15em",
  },
};
