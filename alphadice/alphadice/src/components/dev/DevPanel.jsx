import { useState } from "react";
import { useGame } from "../../store/gameStore";
import { SKILLS } from "../../data/skills";
import { RUN_MAP } from "../../data/runMap";
import { disableDevMode } from "../../utils/devMode";

// === DevPanel ===
//
// Floating dev-only UI mounted from App.jsx when ?dev=1 / #dev is active.
// Six tabs cover the most common dev workflows:
//   profile  — unlock characters, reset progress
//   combat   — adjust HP/dice mid-battle, refill resources
//   skills   — grant/remove skills, reset cooldowns
//   map      — warp to specific nodes (boss skip, etc.)
//   gallery  — every PNG icon in /public/ui/* on one page
//   debug    — console toggle, shake intensity, dev mode off
//
// The panel hides behind a small floating button so it doesn't block the
// game during normal play.

const TABS = [
  { id: "profile", label: "프로필" },
  { id: "combat",  label: "전투" },
  { id: "skills",  label: "스킬" },
  { id: "map",     label: "맵" },
  { id: "gallery", label: "갤러리" },
  { id: "debug",   label: "디버그" },
];

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("profile");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={styles.toggleBtn}
        title="Dev 도구 열기"
      >
        DEV
      </button>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>🛠 DEV</span>
        <div style={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                ...styles.tabBtn,
                ...(tab === t.id ? styles.tabBtnActive : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={styles.closeBtn}
        >
          ×
        </button>
      </div>

      <div style={styles.body}>
        {tab === "profile" && <ProfileTab />}
        {tab === "combat"  && <CombatTab />}
        {tab === "skills"  && <SkillsTab />}
        {tab === "map"     && <MapTab />}
        {tab === "gallery" && <GalleryTab />}
        {tab === "debug"   && <DebugTab />}
      </div>
    </div>
  );
}

// === Profile tab ===
function ProfileTab() {
  const devGrantVictories = useGame((s) => s.devGrantVictories);
  const devResetProfile = useGame((s) => s.devResetProfile);
  return (
    <div style={styles.tabBody}>
      <Section title="캐릭터 해금">
        <Row>
          <button style={styles.actionBtn} onClick={() => devGrantVictories(0)}>
            0회 (기사만)
          </button>
          <button style={styles.actionBtn} onClick={() => devGrantVictories(1)}>
            1회 (+도적)
          </button>
          <button style={styles.actionBtn} onClick={() => devGrantVictories(2)}>
            2회 (+마법사)
          </button>
          <button style={styles.actionBtn} onClick={() => devGrantVictories(99)}>
            전체 해금
          </button>
        </Row>
        <Note>변경 후 캐릭터 선택 화면 새로고침 (또는 메인으로 돌아가면 반영).</Note>
      </Section>
      <Section title="프로필 초기화">
        <Row>
          <button
            style={{ ...styles.actionBtn, background: "#8a3a32" }}
            onClick={() => {
              if (window.confirm("프로필을 완전히 삭제합니다. 계속?")) devResetProfile();
            }}
          >
            전체 리셋
          </button>
        </Row>
      </Section>
    </div>
  );
}

// === Combat tab ===
function CombatTab() {
  const phase = useGame((s) => s.phase);
  const playerHP = useGame((s) => s.playerHP);
  const playerMaxHP = useGame((s) => s.playerMaxHP);
  const enemies = useGame((s) => s.enemies);
  const dice = useGame((s) => s.dice);
  const devSetPlayerHP = useGame((s) => s.devSetPlayerHP);
  const devSetEnemyHP = useGame((s) => s.devSetEnemyHP);
  const devKillAllEnemies = useGame((s) => s.devKillAllEnemies);
  const devSetDieFace = useGame((s) => s.devSetDieFace);
  const devSetAllDiceFaces = useGame((s) => s.devSetAllDiceFaces);
  const devRefillResources = useGame((s) => s.devRefillResources);
  const [bulkFace, setBulkFace] = useState("A");

  if (phase !== "battle") {
    return (
      <div style={styles.tabBody}>
        <Note>전투 중에만 사용 가능합니다. 현재 phase: {phase}</Note>
      </div>
    );
  }
  return (
    <div style={styles.tabBody}>
      <Section title={`내 HP (${playerHP} / ${playerMaxHP})`}>
        <input
          type="range"
          min={0}
          max={playerMaxHP}
          value={playerHP}
          onChange={(e) => devSetPlayerHP(parseInt(e.target.value, 10))}
          style={{ width: "100%" }}
        />
        <Row>
          <button style={styles.actionBtn} onClick={() => devSetPlayerHP(playerMaxHP)}>
            풀회복
          </button>
          <button style={styles.actionBtn} onClick={() => devSetPlayerHP(1)}>
            1로 (위기)
          </button>
        </Row>
      </Section>

      <Section title="적">
        {enemies.map((e, i) => (
          <div key={e.id} style={styles.enemyRow}>
            <span style={styles.enemyName}>
              {e.name || e.id} ({e.hp}/{e.maxHp})
              {!e.alive && " · 죽음"}
            </span>
            <input
              type="range"
              min={0}
              max={e.maxHp}
              value={e.hp}
              onChange={(ev) => devSetEnemyHP(i, parseInt(ev.target.value, 10))}
              style={{ flex: 1 }}
              disabled={!e.alive}
            />
            <button
              style={styles.smallBtn}
              onClick={() => devSetEnemyHP(i, 0)}
              disabled={!e.alive}
            >
              즉사
            </button>
          </div>
        ))}
        <Row>
          <button
            style={{ ...styles.actionBtn, background: "#8a3a32" }}
            onClick={devKillAllEnemies}
          >
            전체 즉사
          </button>
        </Row>
      </Section>

      <Section title="다이스 면 조작">
        <div style={styles.diceList}>
          {dice.map((d) => (
            <div key={d.dieIndex} style={styles.dieEdit}>
              <span style={styles.dieEditIdx}>#{d.dieIndex}</span>
              <select
                value={d.face}
                onChange={(e) => devSetDieFace(d.dieIndex, e.target.value)}
                style={styles.faceSelect}
              >
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <Row>
          <select
            value={bulkFace}
            onChange={(e) => setBulkFace(e.target.value)}
            style={styles.faceSelect}
          >
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button style={styles.actionBtn} onClick={() => devSetAllDiceFaces(bulkFace)}>
            전체를 {bulkFace}로
          </button>
        </Row>
      </Section>

      <Section title="자원 충전">
        <Row>
          <button style={styles.actionBtn} onClick={devRefillResources}>
            리롤·변환·쿨다운 초기화
          </button>
        </Row>
      </Section>
    </div>
  );
}

// === Skills tab ===
function SkillsTab() {
  const skillSlots = useGame((s) => s.skillSlots);
  const inventory = useGame((s) => s.inventory);
  const devGrantSkill = useGame((s) => s.devGrantSkill);
  const devClearSkills = useGame((s) => s.devClearSkills);
  const devRefillResources = useGame((s) => s.devRefillResources);

  const owned = new Set(skillSlots.map((s) => s.skillId));
  const placedSet = new Set(inventory.placements.map((p) => p.skillId));

  const allSkillIds = Object.keys(SKILLS);
  return (
    <div style={styles.tabBody}>
      <Section title="현재 장착">
        <div style={styles.skillGrid}>
          {skillSlots.map((s) => {
            const skill = SKILLS[s.skillId];
            if (!skill) return null;
            const placed = placedSet.has(s.skillId) || s.skillId === "basic_attack";
            return (
              <div key={s.id} style={styles.skillChipOwned}>
                <img src={skill.icon} alt="" style={styles.skillChipIcon} />
                <span>{skill.name}</span>
                {!placed && <span style={styles.bagTag}>가방</span>}
              </div>
            );
          })}
        </div>
        <Row>
          <button
            style={{ ...styles.actionBtn, background: "#8a3a32" }}
            onClick={devClearSkills}
          >
            전부 제거 (기본 공격 제외)
          </button>
          <button style={styles.actionBtn} onClick={devRefillResources}>
            쿨다운 리셋
          </button>
        </Row>
      </Section>

      <Section title="스킬 부여 (클릭 → 즉시 추가)">
        <div style={styles.skillGrid}>
          {allSkillIds.map((id) => {
            if (id === "basic_attack" || owned.has(id)) return null;
            const skill = SKILLS[id];
            return (
              <button
                key={id}
                type="button"
                style={styles.skillChip}
                onClick={() => devGrantSkill(id)}
                title={skill.description}
              >
                <img src={skill.icon} alt="" style={styles.skillChipIcon} />
                <span>{skill.name}</span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// === Map tab ===
function MapTab() {
  const run = useGame((s) => s.run);
  const phase = useGame((s) => s.phase);
  const devWarpToNode = useGame((s) => s.devWarpToNode);
  const chooseMapNode = useGame((s) => s.chooseMapNode);

  if (!run) {
    return (
      <div style={styles.tabBody}>
        <Note>아직 런 시작 전 — 캐릭터 선택부터.</Note>
      </div>
    );
  }
  const nodes = Object.values(RUN_MAP.nodes);
  return (
    <div style={styles.tabBody}>
      <Section title={`현재 노드: ${run.currentNodeId}`}>
        <Note>워프는 노드 마커만 이동시킵니다. 전투를 시작하려면 phase가 map일 때 클릭하세요.</Note>
      </Section>
      <Section title="노드 목록">
        <div style={styles.nodeGrid}>
          {nodes.map((n) => {
            const visited = run.visited.includes(n.id);
            const isCurrent = n.id === run.currentNodeId;
            return (
              <div key={n.id} style={styles.nodeRow}>
                <span style={{
                  ...styles.nodeTag,
                  background: nodeColor(n.type),
                }}>
                  {n.type}
                </span>
                <span style={styles.nodeLabel}>
                  {n.label || n.id}
                  {isCurrent && " ←현재"}
                  {visited && !isCurrent && " · 방문"}
                </span>
                <button
                  style={styles.smallBtn}
                  onClick={() => devWarpToNode(n.id)}
                >
                  워프
                </button>
                {phase === "map" && n.id !== run.currentNodeId && (
                  <button
                    style={styles.smallBtn}
                    onClick={() => {
                      // Warp then immediately enter the encounter
                      devWarpToNode(n.id);
                      // Need to set as a child of currentNode for chooseMapNode
                      // Simpler: directly use chooseMapNode and hope the
                      // node is reachable. If not, the user can warp first.
                      try { chooseMapNode(n.id); } catch {}
                    }}
                  >
                    바로 진입
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function nodeColor(type) {
  return {
    start: "#5a4a3a",
    battle: "#8a3a32",
    elite: "#5a2a6a",
    rest: "#2a5a3a",
    boss: "#3a2a5a",
  }[type] || "#444";
}

// === Gallery tab ===
function GalleryTab() {
  // Hardcoded list — keeps the panel self-contained without a build-time
  // glob. Update when /public/ui/* changes.
  const cards = [
    "aim", "bag", "boot", "bow", "brain", "card_couple", "card_deck",
    "card_hand", "card_inspect", "card_lock", "card_pull", "card_select",
    "card_shuffle", "card_swap", "chain", "chain_break", "cloak", "clover",
    "coin", "crown", "dagger", "diamond", "die", "die_throw", "down",
    "exclamation", "fire", "fist", "foot", "hammer", "heart", "helmet",
    "inspect", "leaf", "left", "lightning", "magic", "moon", "paw",
    "potion", "puzzle", "question", "right", "scroll", "shield",
    "shield_break", "skull", "snow", "spiral", "staf", "stone", "sun",
    "sword", "sword_break", "time", "up", "water", "wind", "wings",
  ];
  const overlays = ["check", "plus", "round", "value", "x"];
  const portraits = [
    "Blue_Knight_Badge", "Green_Rogue_Badge", "Red_Mage_Badge",
    "Yellow_Barbarian_Badge",
  ];
  const [copied, setCopied] = useState(null);

  function copyPath(path) {
    navigator.clipboard.writeText(path);
    setCopied(path);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div style={styles.tabBody}>
      <Section title="card/ (전투/스킬 아이콘)">
        <div style={styles.iconGrid}>
          {cards.map((n) => {
            const path = `/ui/card/${n}.png`;
            return (
              <div key={n} style={styles.iconCell} onClick={() => copyPath(path)} title={path}>
                <img src={path} alt={n} style={styles.iconImg} />
                <span style={styles.iconName}>{n}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="overlay/ (인디케이터)">
        <div style={styles.iconGrid}>
          {overlays.map((n) => {
            const path = `/ui/overlay/${n}.png`;
            return (
              <div key={n} style={styles.iconCell} onClick={() => copyPath(path)} title={path}>
                <img src={path} alt={n} style={styles.iconImg} />
                <span style={styles.iconName}>{n}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="portrait/ (캐릭터)">
        <div style={styles.iconGrid}>
          {portraits.map((n) => {
            const path = `/ui/portrait/${n}.png`;
            return (
              <div key={n} style={{ ...styles.iconCell, width: 80 }} onClick={() => copyPath(path)} title={path}>
                <img src={path} alt={n} style={{ ...styles.iconImg, width: 64, height: 64 }} />
                <span style={styles.iconName}>{n}</span>
              </div>
            );
          })}
        </div>
      </Section>
      {copied && (
        <div style={styles.copyToast}>경로 복사됨: {copied}</div>
      )}
    </div>
  );
}

// === Debug tab ===
function DebugTab() {
  const [logsOn, setLogsOn] = useState(
    typeof window !== "undefined" && window.__alphadice_logs === true,
  );
  const [shakeReduced, setShakeReduced] = useState(
    typeof window !== "undefined" && window.__alphadice_reduceShake === true,
  );

  function toggleLogs() {
    const next = !logsOn;
    if (typeof window !== "undefined") window.__alphadice_logs = next;
    setLogsOn(next);
  }
  function toggleShake() {
    const next = !shakeReduced;
    if (typeof window !== "undefined") window.__alphadice_reduceShake = next;
    setShakeReduced(next);
  }
  function turnOffDevMode() {
    if (window.confirm("Dev 모드를 끕니다. 다시 켜려면 ?dev=1 로 접속하세요.")) {
      disableDevMode();
      window.location.search = "?dev=0";
    }
  }
  function dumpState() {
    const s = useGame.getState();
    console.log("[dev] full store state:", s);
    alert("콘솔에 store 상태를 출력했습니다.");
  }
  return (
    <div style={styles.tabBody}>
      <Section title="토글">
        <Row>
          <button
            style={{ ...styles.actionBtn, ...(logsOn ? styles.actionBtnActive : {}) }}
            onClick={toggleLogs}
          >
            시퀀스 로그 {logsOn ? "ON" : "OFF"}
          </button>
          <button
            style={{ ...styles.actionBtn, ...(shakeReduced ? styles.actionBtnActive : {}) }}
            onClick={toggleShake}
          >
            잔공감(흔들림) 감소 {shakeReduced ? "ON" : "OFF"}
          </button>
        </Row>
        <Note>로그/흔들림 토글은 window 전역 플래그에 저장됩니다 (페이지 새로고침 시 리셋).</Note>
      </Section>
      <Section title="유틸">
        <Row>
          <button style={styles.actionBtn} onClick={dumpState}>
            store 상태 콘솔 출력
          </button>
        </Row>
      </Section>
      <Section title="Dev 모드 끄기">
        <Row>
          <button
            style={{ ...styles.actionBtn, background: "#8a3a32" }}
            onClick={turnOffDevMode}
          >
            Dev 모드 OFF
          </button>
        </Row>
      </Section>
    </div>
  );
}

// === Layout primitives ===
function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}
function Row({ children }) {
  return <div style={styles.row}>{children}</div>;
}
function Note({ children }) {
  return <div style={styles.note}>{children}</div>;
}

// === Styles ===
const PANEL_BG = "#1a1410";
const ACCENT = "#fce6ad";
const SUBTLE = "#8a7a5e";

const styles = {
  toggleBtn: {
    position: "fixed",
    top: 10,
    right: 10,
    zIndex: 2147483646, // just under max int so modals still beat it
    background: "#c9302c",
    color: "#fff",
    border: "2px solid #1a1410",
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    padding: "4px 10px",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    cursor: "pointer",
    letterSpacing: 1,
  },
  panel: {
    position: "fixed",
    top: 10,
    right: 10,
    zIndex: 2147483646,
    width: 480,
    maxHeight: "92vh",
    background: PANEL_BG,
    border: `3px solid ${ACCENT}`,
    color: ACCENT,
    display: "flex",
    flexDirection: "column",
    boxShadow: "6px 6px 0 rgba(0,0,0,0.7)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: 6,
    borderBottom: `1px solid ${ACCENT}40`,
    gap: 6,
  },
  title: {
    fontFamily: "var(--font-arcade)",
    fontSize: 13,
    color: "#c9302c",
    fontWeight: "bold",
  },
  tabs: {
    display: "flex",
    flex: 1,
    gap: 2,
    flexWrap: "wrap",
  },
  tabBtn: {
    background: "transparent",
    color: SUBTLE,
    border: `1px solid ${SUBTLE}`,
    padding: "2px 8px",
    fontFamily: "var(--font-arcade)",
    fontSize: 10,
    cursor: "pointer",
  },
  tabBtnActive: {
    background: ACCENT,
    color: PANEL_BG,
    borderColor: ACCENT,
  },
  closeBtn: {
    background: "transparent",
    color: ACCENT,
    border: `1px solid ${ACCENT}`,
    width: 22,
    height: 22,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "var(--font-display)",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: 8,
  },
  tabBody: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  section: {
    background: "rgba(252,230,173,0.04)",
    border: `1px solid ${SUBTLE}30`,
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  sectionTitle: {
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    color: ACCENT,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  row: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  note: {
    fontFamily: "var(--font-display)",
    fontSize: 10,
    color: SUBTLE,
    fontStyle: "italic",
  },
  actionBtn: {
    background: "#5a4a3a",
    color: ACCENT,
    border: `1px solid ${ACCENT}`,
    padding: "4px 10px",
    fontFamily: "var(--font-display)",
    fontSize: 11,
    cursor: "pointer",
  },
  actionBtnActive: {
    background: "#52b788",
    color: PANEL_BG,
  },
  smallBtn: {
    background: "#3a2a1f",
    color: ACCENT,
    border: `1px solid ${SUBTLE}`,
    padding: "2px 6px",
    fontFamily: "var(--font-display)",
    fontSize: 10,
    cursor: "pointer",
  },
  enemyRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 0",
  },
  enemyName: {
    fontFamily: "var(--font-display)",
    fontSize: 10,
    minWidth: 140,
  },
  diceList: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 4,
  },
  dieEdit: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(0,0,0,0.4)",
    padding: 4,
  },
  dieEditIdx: {
    fontFamily: "var(--font-arcade)",
    fontSize: 9,
    color: SUBTLE,
  },
  faceSelect: {
    background: PANEL_BG,
    color: ACCENT,
    border: `1px solid ${SUBTLE}`,
    padding: "2px 4px",
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
  },
  skillGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 4,
  },
  skillChip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(252,230,173,0.05)",
    border: `1px solid ${SUBTLE}`,
    padding: 4,
    color: ACCENT,
    fontFamily: "var(--font-display)",
    fontSize: 10,
    cursor: "pointer",
    textAlign: "left",
  },
  skillChipOwned: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(45,107,79,0.25)",
    border: `1px solid #52b788`,
    padding: 4,
    fontFamily: "var(--font-display)",
    fontSize: 10,
  },
  skillChipIcon: {
    width: 20,
    height: 20,
  },
  bagTag: {
    marginLeft: "auto",
    background: ACCENT,
    color: PANEL_BG,
    padding: "0 4px",
    fontFamily: "var(--font-arcade)",
    fontSize: 9,
  },
  nodeGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  nodeRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 3,
    background: "rgba(0,0,0,0.3)",
  },
  nodeTag: {
    color: "#fff",
    fontFamily: "var(--font-arcade)",
    fontSize: 9,
    padding: "1px 5px",
    minWidth: 40,
    textAlign: "center",
  },
  nodeLabel: {
    flex: 1,
    fontFamily: "var(--font-display)",
    fontSize: 11,
  },
  iconGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
    gap: 4,
  },
  iconCell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: 4,
    background: "rgba(0,0,0,0.3)",
    cursor: "pointer",
    border: `1px solid transparent`,
  },
  iconImg: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  iconName: {
    fontFamily: "var(--font-arcade)",
    fontSize: 8,
    color: SUBTLE,
    textAlign: "center",
    wordBreak: "break-all",
  },
  copyToast: {
    position: "fixed",
    bottom: 20,
    right: 20,
    background: "#52b788",
    color: PANEL_BG,
    padding: "6px 12px",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
    zIndex: 2147483647,
  },
};
