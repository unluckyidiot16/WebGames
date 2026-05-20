import { useState } from "react";
import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import { RUN_MAP, getNode } from "../../data/runMap";
import InventoryModal from "./InventoryModal";
import DiceDeckViewer from "./DiceDeckViewer";

// === MapScreen ===
// Phase 4A: StS-style horizontal node map. Player picks an outgoing
// node from the current location. Visited nodes are greyed; available
// next nodes glow.

const CELL_W = 100;   // horizontal spacing between layers (tighter for 10-node map)
const CELL_H = 90;    // vertical spacing between lanes
const NODE_SIZE = 64; // diameter of each node circle

// Node type → visual config. Picto icons are pure white silhouettes,
// so we just tint them via CSS filter or color them inline. Background
// color signals the node type at a glance.
const NODE_VISUALS = {
  start: { bg: "#5a4a3a", border: "#bca480", icon: "/ui/picto/map_pin_1.png", label: "출발" },
  battle: { bg: "#8a3a32", border: "#c9302c", icon: "/ui/picto/battle.png" },
  elite: { bg: "#5a2a6a", border: "#9d7ad6", icon: "/ui/picto/skull_1.png" },
  rest: { bg: "#2a5a3a", border: "#52b788", icon: "/ui/picto/bonefire.png" },
  event: { bg: "#5a4a8a", border: "#9ec5ff", icon: "/ui/card/question.png" },
  boss: { bg: "#3a2a5a", border: "#e8b923", icon: "/ui/picto/boss.png" },
};

export default function MapScreen() {
  const character = useGame(pickChar);
  const run = useGame((s) => s.run);
  const playerHP = useGame((s) => s.playerHP);
  const playerMaxHP = useGame((s) => s.playerMaxHP);
  const message = useGame((s) => s.message);
  const chooseMapNode = useGame((s) => s.chooseMapNode);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [deckViewerOpen, setDeckViewerOpen] = useState(false);

  const nodes = Object.values(RUN_MAP.nodes);
  const current = getNode(run.currentNodeId);
  const visited = new Set(run.visited);

  // Convert (layer, lane) → (px, py) for absolute positioning. Center
  // the map both horizontally (within its container) and vertically
  // (around middle lane 0).
  const layerCount = RUN_MAP.layers;
  const laneRange = RUN_MAP.laneRange;
  const mapW = (layerCount - 1) * CELL_W + NODE_SIZE + 80;
  const mapH = laneRange * 2 * CELL_H + NODE_SIZE + 80;

  function nodeXY(n) {
    return {
      x: 40 + n.layer * CELL_W,
      y: mapH / 2 + n.lane * CELL_H - NODE_SIZE / 2,
    };
  }

  // Build the list of nodes available to click — must be in `current.next`
  // and not yet visited.
  const availableNext = current
    ? current.next.filter((id) => !visited.has(id))
    : [];
  const availableSet = new Set(availableNext);

  // Collect edges so we can render lines between connected layers.
  const edges = [];
  for (const n of nodes) {
    for (const nextId of n.next) {
      const target = getNode(nextId);
      if (!target) continue;
      const a = nodeXY(n);
      const b = nodeXY(target);
      edges.push({
        from: n.id,
        to: nextId,
        x1: a.x + NODE_SIZE / 2,
        y1: a.y + NODE_SIZE / 2,
        x2: b.x + NODE_SIZE / 2,
        y2: b.y + NODE_SIZE / 2,
        // An edge is "traveled" if both endpoints are visited (i.e. this
        // is part of the player's actual path through the map).
        traveled: visited.has(n.id) && visited.has(nextId),
        // An edge is "live" if it's clickable next step.
        live: n.id === run.currentNodeId && availableSet.has(nextId),
      });
    }
  }

  const hpPct = (playerHP / playerMaxHP) * 100;

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div
          style={{
            ...styles.classBadge,
            background: character?.color || "#3a2a1f",
          }}
        >
          {character?.name || "용사"}
        </div>
        <div style={styles.hpBlock}>
          <span style={styles.hpLabel}>HP</span>
          <div style={styles.hpBar}>
            <div
              style={{
                ...styles.hpFill,
                width: `${hpPct}%`,
                background:
                  hpPct > 50 ? "#52b788" : hpPct > 25 ? "#e8b923" : "#c9302c",
              }}
            />
            <span style={styles.hpText}>
              {playerHP} / {playerMaxHP}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInventoryOpen(true)}
          style={styles.inventoryBtn}
          title="장착한 스킬 확인 + 가방에서 스왑"
        >
          <img src="/ui/card/bag.png" alt="" style={{width:18,height:18,verticalAlign:"middle",marginRight:6}} />인벤토리 / 가방
        </button>
        <button
          type="button"
          onClick={() => setDeckViewerOpen(true)}
          style={styles.inventoryBtn}
          title="내 다이스 덱 보기 — 각 다이스의 6면 미리보기"
        >
          <img src="/ui/card/die.png" alt="" style={{width:18,height:18,verticalAlign:"middle",marginRight:6}} />다이스 덱
        </button>
        <div style={styles.title}>
          <img src="/ui/item/map.png" alt="" style={styles.titleIcon} />
          <span>지도 — 다음 행선지 선택</span>
        </div>
      </div>

      {inventoryOpen && (
        <InventoryModal onClose={() => setInventoryOpen(false)} />
      )}
      {deckViewerOpen && (
        <DiceDeckViewer onClose={() => setDeckViewerOpen(false)} />
      )}

      {message && (
        <div style={styles.message}>
          <span>{message}</span>
        </div>
      )}

      <div style={styles.mapWrap}>
        <div style={{ ...styles.mapInner, width: mapW, height: mapH }}>
          {/* SVG layer for connecting lines — drawn first, behind nodes. */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: mapW,
              height: mapH,
              pointerEvents: "none",
            }}
          >
            {edges.map((e) => (
              <line
                key={`${e.from}->${e.to}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={
                  e.traveled
                    ? "#bca480"
                    : e.live
                    ? "#ffd700"
                    : "rgba(188, 164, 128, 0.25)"
                }
                strokeWidth={e.live ? 4 : 3}
                strokeDasharray={e.traveled ? "0" : e.live ? "0" : "6 4"}
              />
            ))}
          </svg>

          {/* Node buttons. */}
          {nodes.map((n) => {
            const { x, y } = nodeXY(n);
            const isCurrent = n.id === run.currentNodeId;
            const isVisited = visited.has(n.id);
            const isAvailable = availableSet.has(n.id);
            const v = NODE_VISUALS[n.type];

            return (
              <NodeButton
                key={n.id}
                node={n}
                visuals={v}
                x={x}
                y={y}
                isCurrent={isCurrent}
                isVisited={isVisited}
                isAvailable={isAvailable}
                onClick={
                  isAvailable ? () => chooseMapNode(n.id) : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <div style={styles.legend}>
        <LegendItem icon="/ui/picto/battle.png" color="#c9302c" label="전투" />
        <LegendItem icon="/ui/picto/skull_1.png" color="#9d7ad6" label="정예" />
        <LegendItem icon="/ui/picto/bonefire.png" color="#52b788" label="쉼터 (+40% HP)" />
        <LegendItem icon="/ui/card/question.png" color="#9ec5ff" label="이벤트 (+20% HP)" />
        <LegendItem icon="/ui/picto/boss.png" color="#e8b923" label="보스" />
      </div>
    </div>
  );
}

function NodeButton({ node, visuals, x, y, isCurrent, isVisited, isAvailable, onClick }) {
  // State styling. Available nodes glow; visited dim; unreachable nearly
  // hidden. The current node gets a map-pin marker floating above it.
  let opacity = 0.35;
  let scale = 1;
  let glow = "none";
  if (isCurrent) {
    opacity = 1;
    scale = 1;
  } else if (isAvailable) {
    opacity = 1;
    scale = 1.05;
    glow = "0 0 0 4px rgba(255,215,0,0.6), 0 0 20px rgba(255,215,0,0.4)";
  } else if (isVisited) {
    opacity = 0.65;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: NODE_SIZE,
        height: NODE_SIZE,
        opacity,
        transform: `scale(${scale})`,
        transition: "transform 200ms ease, opacity 200ms ease",
      }}
    >
      {/* Pin marker for current location, hovering above the node. */}
      {isCurrent && (
        <img
          src="/ui/item/map_pin.png"
          alt=""
          style={{
            position: "absolute",
            top: -36,
            left: NODE_SIZE / 2 - 16,
            width: 32,
            height: 32,
            filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.6))",
            animation: "mapPinBob 900ms ease-in-out infinite",
          }}
        />
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={!isAvailable}
        title={node.label}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: visuals.bg,
          border: `4px solid ${visuals.border}`,
          boxShadow: glow !== "none" ? glow : "3px 3px 0 rgba(0,0,0,0.5)",
          cursor: isAvailable ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          position: "relative",
        }}
      >
        <img
          src={visuals.icon}
          alt=""
          style={{
            width: NODE_SIZE * 0.5,
            height: NODE_SIZE * 0.5,
            // Picto icons are pure white; tint with the border accent for
            // available nodes (warmer look), white otherwise.
            filter: isAvailable
              ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
              : "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
          }}
        />
        {/* Checkmark overlay for cleared nodes. */}
        {isVisited && !isCurrent && (
          <div style={styles.visitedCheck}>✓</div>
        )}
      </button>

      {/* Label below the node. */}
      <div
        style={{
          position: "absolute",
          top: NODE_SIZE + 4,
          left: -20,
          right: -20,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 11,
          color: isAvailable ? "#fce6ad" : "#bca480",
          fontWeight: "bold",
          textShadow: "1px 1px 0 rgba(0,0,0,0.7)",
          pointerEvents: "none",
        }}
      >
        {node.label}
      </div>
    </div>
  );
}

function LegendItem({ icon, color, label }) {
  return (
    <div style={styles.legendItem}>
      <div
        style={{
          ...styles.legendDot,
          background: color,
        }}
      >
        <img src={icon} alt="" style={styles.legendIcon} />
      </div>
      <span>{label}</span>
    </div>
  );
}

const styles = {
  screen: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(ellipse at center, #2a1f17 0%, #14100c 100%)",
    color: "#fce6ad",
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    padding: "20px 32px",
    gap: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  classBadge: {
    color: "white",
    padding: "4px 12px",
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: "bold",
    border: "2px solid #1a1410",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
    textShadow: "1px 1px 0 rgba(0,0,0,0.4)",
  },
  hpBlock: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  hpLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    color: "#c9302c",
    fontWeight: "bold",
  },
  hpBar: {
    width: 220,
    height: 22,
    background: "#3a2a1f",
    border: "2px solid #1a1410",
    position: "relative",
    overflow: "hidden",
  },
  hpFill: {
    height: "100%",
    transition: "width 400ms ease",
  },
  hpText: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    color: "white",
    textShadow: "1px 1px 0 #000",
    fontWeight: "bold",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
    fontFamily: "var(--font-arcade)",
    fontSize: 14,
    color: "#e8b923",
    letterSpacing: "0.05em",
  },
  titleIcon: { width: 36, height: 36 },
  inventoryBtn: {
    background: "#1a1410",
    color: "#fce6ad",
    border: "2px solid #fce6ad",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
    padding: "6px 12px",
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
    letterSpacing: 0.5,
  },
  message: {
    background: "rgba(26,20,16,0.85)",
    border: "2px solid #e8b923",
    padding: "6px 16px",
    fontFamily: "var(--font-display)",
    fontSize: 15,
    color: "#fce6ad",
    alignSelf: "center",
  },
  mapWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 360,
  },
  mapInner: {
    position: "relative",
    margin: "0 auto",
  },
  visitedCheck: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    background: "#52b788",
    border: "2px solid #1a1410",
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: 14,
    fontWeight: "bold",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
    paddingTop: 8,
    borderTop: "1px solid rgba(188,164,128,0.25)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    color: "#bca480",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #1a1410",
  },
  legendIcon: {
    width: 16,
    height: 16,
  },
};

// CSS keyframes for the map pin bob. Injected once via a <style> tag so
// we don't depend on a global stylesheet edit.
if (typeof document !== "undefined" && !document.getElementById("mapscreen-anims")) {
  const styleEl = document.createElement("style");
  styleEl.id = "mapscreen-anims";
  styleEl.textContent = `
    @keyframes mapPinBob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `;
  document.head.appendChild(styleEl);
}
