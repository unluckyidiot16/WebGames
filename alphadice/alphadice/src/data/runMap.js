// === Run Map (expanded — 9 nodes + boss = 10 total) ===
//
// A run is a directed graph of nodes. The player starts at the leftmost
// "start" node and must reach the boss on the far right by picking one
// of the current node's children each step.
//
// Node types:
//   battle  — minion-tier fight, awards dice reward
//   elite   — harder fight, awards skill reward
//   rest    — heal 40% max HP; no fight, no reward picker
//   event   — narrative choice node (Sprint 6 — currently degrades to
//             a rest-style heal if encountered; will gain content later)
//   boss    — final fight, awards both rewards, then run victory

export const RUN_MAP = {
  nodes: {
    start: {
      id: "start", type: "start", label: "출발",
      layer: 0, lane: 0,
      next: ["b1_a", "b1_b"],
    },

    // Layer 1: easy openers
    b1_a: {
      id: "b1_a", type: "battle", label: "졸개 한 마리",
      layer: 1, lane: -1,
      next: ["b2_a", "e2_a"],
      encounter: { tier: "minion", enemies: [{ type: "skeleton_minion", x: 3.5, z: 0.5 }] },
    },
    b1_b: {
      id: "b1_b", type: "battle", label: "졸개 둘",
      layer: 1, lane: 1,
      next: ["b2_a", "e2_a"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_minion", x: 2.5, z: 1.5 },
          { type: "skeleton_minion", x: 5.0, z: -1.5 },
        ],
      },
    },

    // Layer 2: battle vs event
    b2_a: {
      id: "b2_a", type: "battle", label: "도적단",
      layer: 2, lane: -1,
      next: ["r3_a", "b3_b"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_rogue", x: 3.0, z: 1.5 },
          { type: "skeleton_minion", x: 5.5, z: -1.5 },
        ],
      },
    },
    e2_a: {
      id: "e2_a", type: "event", label: "수상한 상자",
      layer: 2, lane: 1,
      next: ["r3_a", "b3_b"],
    },

    // Layer 3: rest opportunity
    r3_a: {
      id: "r3_a", type: "rest", label: "쉼터",
      layer: 3, lane: -1,
      next: ["b4_a", "el4_a"],
    },
    b3_b: {
      id: "b3_b", type: "battle", label: "야영지",
      layer: 3, lane: 1,
      next: ["b4_a", "el4_a"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_minion", x: 3.0, z: 1.5 },
          { type: "skeleton_minion", x: 5.0, z: -0.5 },
          { type: "skeleton_minion", x: 5.5, z: -2.5 },
        ],
      },
    },

    // Layer 4: first elite (skill reward)
    b4_a: {
      id: "b4_a", type: "battle", label: "유랑 마법사",
      layer: 4, lane: -1,
      next: ["e5_a", "b5_b"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_mage", x: 3.5, z: 0.5 },
          { type: "skeleton_minion", x: 5.5, z: -1.5 },
        ],
      },
    },
    el4_a: {
      id: "el4_a", type: "elite", label: "정예 전사",
      layer: 4, lane: 1,
      next: ["e5_a", "b5_b"],
      encounter: {
        tier: "elite",
        enemies: [
          { type: "skeleton_warrior", x: 3.0, z: 1.5 },
          { type: "skeleton_minion", x: 5.5, z: -1.5 },
        ],
      },
    },

    // Layer 5: event vs battle
    e5_a: {
      id: "e5_a", type: "event", label: "유물 제단",
      layer: 5, lane: -1,
      next: ["b6_a", "r6_b"],
    },
    b5_b: {
      id: "b5_b", type: "battle", label: "도적 추격대",
      layer: 5, lane: 1,
      next: ["b6_a", "r6_b"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_rogue", x: 3.0, z: 1.5 },
          { type: "skeleton_rogue", x: 5.5, z: -1.5 },
        ],
      },
    },

    // Layer 6: mid-run rest
    b6_a: {
      id: "b6_a", type: "battle", label: "마법진 수호자",
      layer: 6, lane: -1,
      next: ["r7_a", "el7_b"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_mage", x: 3.5, z: 1.5 },
          { type: "skeleton_warrior", x: 5.5, z: -1.5 },
        ],
      },
    },
    r6_b: {
      id: "r6_b", type: "rest", label: "쉼터",
      layer: 6, lane: 1,
      next: ["r7_a", "el7_b"],
    },

    // Layer 7: second elite
    r7_a: {
      id: "r7_a", type: "rest", label: "쉼터",
      layer: 7, lane: -1,
      next: ["b8_a", "b8_b"],
    },
    el7_b: {
      id: "el7_b", type: "elite", label: "정예 마법진",
      layer: 7, lane: 1,
      next: ["b8_a", "b8_b"],
      encounter: {
        tier: "elite",
        enemies: [
          { type: "skeleton_mage", x: 3.0, z: 1.5 },
          { type: "skeleton_mage", x: 5.5, z: -1.5 },
        ],
      },
    },

    // Layer 8: pre-boss
    b8_a: {
      id: "b8_a", type: "battle", label: "어둠의 수호자",
      layer: 8, lane: -1,
      next: ["b9_a"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_warrior", x: 3.5, z: 1.5 },
          { type: "skeleton_warrior", x: 5.5, z: -1.5 },
        ],
      },
    },
    b8_b: {
      id: "b8_b", type: "battle", label: "사령마법진",
      layer: 8, lane: 1,
      next: ["b9_a"],
      encounter: {
        tier: "minion",
        enemies: [
          { type: "skeleton_mage", x: 3.0, z: 1.5 },
          { type: "skeleton_mage", x: 5.0, z: -0.5 },
          { type: "skeleton_minion", x: 5.5, z: -2.5 },
        ],
      },
    },

    // Layer 9: forced final hallway
    b9_a: {
      id: "b9_a", type: "battle", label: "보스의 측근",
      layer: 9, lane: 0,
      next: ["boss"],
      encounter: {
        tier: "elite",
        enemies: [
          { type: "skeleton_warrior", x: 3.0, z: 1.5 },
          { type: "skeleton_mage",    x: 5.0, z: -0.5 },
          { type: "skeleton_rogue",   x: 5.5, z: -2.5 },
        ],
      },
    },

    // Layer 10: BOSS
    boss: {
      id: "boss", type: "boss", label: "최종 — 네크로맨서",
      layer: 10, lane: 0,
      next: [],
      encounter: {
        tier: "boss",
        enemies: [
          { type: "necromancer",     x: 3.5, z:  0.5 },
          { type: "skeleton_minion", x: 5.5, z:  2.0 },
          { type: "skeleton_minion", x: 5.5, z: -2.5 },
        ],
      },
    },
  },

  startNodeId: "start",
  layers: 11,
  laneRange: 1,
};

export function getNode(id) {
  return RUN_MAP.nodes[id] || null;
}

export function isBossNode(id) {
  const n = getNode(id);
  return n?.type === "boss";
}
