import { useGame } from "../../store/gameStore";
import {
  SKILLS,
  rotateShape,
  shapeBounds,
  shapeCells,
} from "../../data/skills";
import Icon from "./Icon";

// === InventoryModal ===
// Floating overlay showing the player's skill loadout as it sits on the
// inventory grid. In phase === "map" (between encounters) it becomes
// interactive — players can move skills between the grid and the bag.
// In phase === "battle" it stays read-only.
//
// The "bag" is implicit: any skillSlots entry whose skillId isn't in
// inventory.placements (and isn't basic_attack, which lives outside the
// inventory system) is in the bag.

const CELL_PX = 56;          // larger than the in-battle tiles since this is a focused view
const GAP_PX = 3;

export default function InventoryModal({ onClose }) {
  const phase = useGame((s) => s.phase);
  const inventory = useGame((s) => s.inventory);
  const skillSlots = useGame((s) => s.skillSlots);
  const equipSkill = useGame((s) => s.equipSkill);
  const unequipSkill = useGame((s) => s.unequipSkill);

  const editable = phase === "map";
  const { width, height, placements } = inventory;

  // Bag = owned skills that aren't placed (and aren't basic_attack).
  const placedIds = new Set(placements.map((p) => p.skillId));
  const bagSkillIds = skillSlots
    .map((s) => s.skillId)
    .filter((id) => id !== "basic_attack" && !placedIds.has(id));

  // Total occupied vs total cells, for a glanceable utilization stat.
  let used = 0;
  for (const p of placements) {
    const r = rotateShape(SKILLS[p.skillId].shape, p.rotation);
    used += shapeCells(r).length;
  }
  const total = width * height;

  const gridW = width * CELL_PX + (width - 1) * GAP_PX;
  const gridH = height * CELL_PX + (height - 1) * GAP_PX;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}><img src="/ui/card/bag.png" alt="" style={{width:18,height:18,verticalAlign:"middle",marginRight:6}} />인벤토리</span>
          <span style={styles.subtitle}>
            {width}×{height} · {used}/{total} 칸 사용
            {editable && " · 클릭으로 스왑"}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.gridWrap}>
          <div
            style={{
              ...styles.grid,
              width: gridW,
              height: gridH,
              gridTemplateColumns: `repeat(${width}, ${CELL_PX}px)`,
              gridTemplateRows: `repeat(${height}, ${CELL_PX}px)`,
              gap: GAP_PX,
            }}
          >
            {Array.from({ length: width * height }).map((_, i) => (
              <div key={i} style={styles.cellBg} />
            ))}

            {placements.map((p) => (
              <SkillTile
                key={p.skillId}
                placement={p}
                slot={skillSlots.find((s) => s.skillId === p.skillId)}
                editable={editable}
                onClick={() => editable && unequipSkill(p.skillId)}
              />
            ))}
          </div>
        </div>

        {/* Bag — only shown in edit mode (map phase). Lists owned-but-not-
            equipped skills as click-to-equip cards. basic_attack is hidden
            because it's always available outside the inventory system. */}
        {editable && (
          <div style={styles.bagSection}>
            <div style={styles.bagHeader}>
              <span style={styles.bagTitle}>가방</span>
              <span style={styles.bagSub}>
                {bagSkillIds.length > 0
                  ? "클릭 → 장착 시도 (모양에 맞는 빈 자리 자동 탐색)"
                  : "비어 있음"}
              </span>
            </div>
            <div style={styles.bagList}>
              {bagSkillIds.map((skillId) => (
                <BagCard
                  key={skillId}
                  skillId={skillId}
                  onClick={() => equipSkill(skillId)}
                />
              ))}
            </div>
            <div style={styles.bagHint}>
              <img src="/ui/card/exclamation.png" alt="" style={{width:13,height:13,verticalAlign:"middle",marginRight:4}} />기본 공격은 인벤토리 밖. 항상 사용 가능.
            </div>
          </div>
        )}

        {!editable && (
          <div style={styles.legend}>
            전투 중에는 변경 불가 · 맵 화면에서 가방 ↔ 인벤토리 교체 가능
          </div>
        )}
      </div>
    </div>
  );
}

// === Per-skill hue palette ===
// Hues assigned deterministically by sorted skill id so we don't get
// visible collisions from a hash function.
const ALL_SKILL_IDS = Object.keys(SKILLS).sort();
const SKILL_HUE = Object.fromEntries(
  ALL_SKILL_IDS.map((id, i) => [
    id,
    Math.round((i * 360) / ALL_SKILL_IDS.length),
  ]),
);

function skillHue(skillId) {
  return SKILL_HUE[skillId] ?? 0;
}

// Compact bag card — icon + name + tiny shape preview. Clicking attempts
// to equip into the grid (the store decides where it fits).
function BagCard({ skillId, onClick }) {
  const skill = SKILLS[skillId];
  if (!skill) return null;
  const hue = skillHue(skillId);
  const cells = shapeCells(skill.shape);
  const { w, h } = shapeBounds(skill.shape);
  const MINI = 8;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.bagCard,
        background: `linear-gradient(180deg, hsl(${hue}, 60%, 78%) 0%, hsl(${hue}, 50%, 62%) 100%)`,
      }}
      title={skill.description}
    >
      <div style={styles.bagCardHead}>
        <Icon src={skill.icon} size={18} />
        <span style={styles.bagCardName}>{skill.name}</span>
      </div>
      <div
        style={{
          position: "relative",
          width: w * (MINI + 1),
          height: h * (MINI + 1),
          marginTop: 4,
        }}
      >
        {cells.map((c) => (
          <div
            key={`${c.x},${c.y}`}
            style={{
              position: "absolute",
              left: c.x * (MINI + 1),
              top: c.y * (MINI + 1),
              width: MINI,
              height: MINI,
              background: "#1a1410",
            }}
          />
        ))}
      </div>
    </button>
  );
}

function SkillTile({ placement, slot, editable, onClick }) {
  const skill = SKILLS[placement.skillId];
  if (!skill) return null;

  const rotated = rotateShape(skill.shape, placement.rotation);
  const cells = shapeCells(rotated);
  const { w, h } = shapeBounds(rotated);

  const left = placement.x * (CELL_PX + GAP_PX);
  const top = placement.y * (CELL_PX + GAP_PX);
  const tileW = w * CELL_PX + (w - 1) * GAP_PX;
  const tileH = h * CELL_PX + (h - 1) * GAP_PX;

  const isOnCD = slot && slot.cooldownLeft > 0;

  // Per-skill color identity. Saturation/lightness held constant so all
  // skills read as the same "family" of pastels — only hue varies.
  const hue = skillHue(placement.skillId);
  const colorTop = `hsl(${hue}, 60%, 80%)`;
  const colorBot = `hsl(${hue}, 50%, 65%)`;
  const tileBg = `linear-gradient(180deg, ${colorTop} 0%, ${colorBot} 100%)`;

  // For each cell, check which neighbors are also occupied by THIS skill.
  // Borders only appear on edges that face the outside — adjacent same-
  // skill cells share an invisible internal boundary. We also extend the
  // cell into the gap on connected sides so the GAP_PX inter-cell gap
  // doesn't visually split the shape.
  const has = (x, y) => cells.some((c) => c.x === x && c.y === y);

  // Geometric centroid of the occupied cells (in cell coords, with gaps).
  // Icon + name float here so the label sits inside the shape's mass —
  // not skewed to one cell, which would look off for L/T shapes.
  const centroidX =
    cells.reduce((s, c) => s + c.x * (CELL_PX + GAP_PX) + CELL_PX / 2, 0) /
    cells.length;
  const centroidY =
    cells.reduce((s, c) => s + c.y * (CELL_PX + GAP_PX) + CELL_PX / 2, 0) /
    cells.length;

  return (
    <div
      onClick={editable ? onClick : undefined}
      title={editable ? "클릭 → 가방으로 빼기" : skill.description}
      style={{
        position: "absolute",
        left,
        top,
        width: tileW,
        height: tileH,
        opacity: isOnCD ? 0.55 : 1,
        cursor: editable ? "pointer" : "default",
      }}
    >
      {/* One colored block per occupied cell, extended into the gaps on
          sides where a same-skill neighbor exists so the whole shape reads
          as a single solid tetris piece. */}
      {cells.map((c) => {
        const nUp = has(c.x, c.y - 1);
        const nDown = has(c.x, c.y + 1);
        const nLeft = has(c.x - 1, c.y);
        const nRight = has(c.x + 1, c.y);

        const baseX = c.x * (CELL_PX + GAP_PX);
        const baseY = c.y * (CELL_PX + GAP_PX);

        // Extend into the gap on sides where we're merging with a neighbor.
        const left2 = baseX - (nLeft ? GAP_PX : 0);
        const top2 = baseY - (nUp ? GAP_PX : 0);
        const width2 =
          CELL_PX + (nLeft ? GAP_PX : 0) + (nRight ? GAP_PX : 0);
        const height2 =
          CELL_PX + (nUp ? GAP_PX : 0) + (nDown ? GAP_PX : 0);

        return (
          <div
            key={`${c.x},${c.y}`}
            style={{
              position: "absolute",
              left: left2,
              top: top2,
              width: width2,
              height: height2,
              background: tileBg,
              // Only draw the outline on edges facing outside the shape.
              borderTop: nUp ? "none" : "2px solid #1a1410",
              borderRight: nRight ? "none" : "2px solid #1a1410",
              borderBottom: nDown ? "none" : "2px solid #1a1410",
              borderLeft: nLeft ? "none" : "2px solid #1a1410",
            }}
          />
        );
      })}

      {/* Single icon + name overlay positioned at the shape's centroid,
          so labels for non-rectangular shapes (L, T) don't drift into a
          corner cell. */}
      <div
        style={{
          position: "absolute",
          left: centroidX,
          top: centroidY,
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "#1a1410",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
          pointerEvents: "none",
        }}
      >
        <Icon src={skill.icon} size={22} />
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 10,
            marginTop: 3,
            fontWeight: "bold",
            textAlign: "center",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          {skill.name}
        </div>
      </div>

      {/* Cooldown badge — only when on CD */}
      {isOnCD && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            fontFamily: "var(--font-arcade)",
            fontSize: 10,
            color: "#7ad6ff",
            background: "rgba(0,0,0,0.65)",
            padding: "1px 4px",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        >
          <img
            src="/ui/card/time.png"
            alt=""
            style={{ width: 10, height: 10, verticalAlign: "middle", marginRight: 2 }}
          />
          {slot.cooldownLeft}
        </div>
      )}
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // drei <Html> uses zIndexRange up to ~16,777,271 — go max int safe
    // value so the modal sits cleanly above projected DOM (HP bars, etc).
    zIndex: 2147483647,
    pointerEvents: "auto",
  },
  panel: {
    background: "linear-gradient(180deg, #2a1f17 0%, #1a1410 100%)",
    border: "3px solid #fce6ad",
    boxShadow: "6px 6px 0 rgba(0,0,0,0.6)",
    padding: "20px 28px 16px",
    color: "#fce6ad",
    minWidth: 340,
    maxWidth: "90vw",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
  },
  title: {
    fontFamily: "var(--font-arcade)",
    fontSize: 18,
    fontWeight: "bold",
    color: "#e8b923",
    letterSpacing: 1,
  },
  subtitle: {
    flex: 1,
    fontFamily: "var(--font-display)",
    fontSize: 11,
    color: "#bca480",
  },
  closeBtn: {
    background: "transparent",
    color: "#fce6ad",
    border: "2px solid #fce6ad",
    width: 30,
    height: 30,
    fontFamily: "var(--font-arcade)",
    fontSize: 14,
    fontWeight: "bold",
    cursor: "pointer",
    lineHeight: 1,
  },
  gridWrap: {
    display: "flex",
    justifyContent: "center",
    padding: 12,
    background: "rgba(0,0,0,0.35)",
    border: "2px solid #1a1410",
  },
  grid: {
    display: "grid",
    position: "relative",
  },
  cellBg: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  legend: {
    fontFamily: "var(--font-display)",
    fontSize: 11,
    color: "#8a7a5e",
    textAlign: "center",
  },
  bagSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  bagHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    paddingBottom: 4,
    borderBottom: "1px solid rgba(188,164,128,0.2)",
  },
  bagTitle: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    color: "#fce6ad",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  bagSub: {
    flex: 1,
    fontFamily: "var(--font-display)",
    fontSize: 10,
    color: "#8a7a5e",
  },
  bagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    minHeight: 60,
    padding: 4,
    background: "rgba(0,0,0,0.35)",
    border: "2px dashed rgba(188,164,128,0.4)",
  },
  bagCard: {
    color: "#1a1410",
    border: "2px solid #1a1410",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    padding: "6px 8px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    fontFamily: "var(--font-display)",
    minWidth: 80,
    transition: "transform 100ms ease",
  },
  bagCardHead: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  bagCardName: {
    fontWeight: "bold",
    fontSize: 11,
  },
  bagHint: {
    fontFamily: "var(--font-display)",
    fontSize: 10,
    color: "#8a7a5e",
    textAlign: "center",
  },
};
