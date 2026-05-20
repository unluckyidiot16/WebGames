import { useState, useEffect } from "react";
import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import { SKILLS } from "../../data/skills";
import { isValidWord } from "../../data/dictionary";
import {
  validateSkillCondition,
  describeSkillCondition,
} from "../../data/skillConditions";
import { getKoreanMeaning } from "../../data/wordlist";
import {
  fetchWordDefinition,
  getCachedDefinition,
} from "../../utils/wordDefinitions";
import Icon from "./Icon";

// === SkillBar ===
// Skill cards arranged horizontally. Each card shows: icon, name, required
// slot shape (□ □ □ ...), assigned dice in slot order, cooldown if any,
// and a Cast button when ready.
//
// Dice can be dropped into a slot via:
//   1. Drag-and-drop (HTML5 DnD)
//   2. Click — clicking a free die assigns to the most recently "armed" slot,
//      or, if no slot armed, to the first skill slot with capacity.
// We expose `armedSkillSlotId` as a prop so DiceTray can light up the active
// slot's target.

export default function SkillBar({ armedSkillSlotId, setArmedSkillSlotId }) {
  const character = useGame(pickChar);
  const skillSlots = useGame((s) => s.skillSlots);
  const dice = useGame((s) => s.dice);
  const turnState = useGame((s) => s.turnState);
  const castSkill = useGame((s) => s.castSkill);
  const clearSkillSlot = useGame((s) => s.clearSkillSlot);
  const unassignDieFromSkill = useGame((s) => s.unassignDieFromSkill);
  const assignDieToSkill = useGame((s) => s.assignDieToSkill);

  const canEdit = turnState === "player_turn";

  if (!character) return null;

  return (
    <div style={styles.wrap}>
      {skillSlots.map((slot) => (
        <SkillCard
          key={slot.slotId}
          slot={slot}
          dice={dice}
          armed={armedSkillSlotId === slot.slotId}
          canEdit={canEdit}
          onArm={() => setArmedSkillSlotId(
            armedSkillSlotId === slot.slotId ? null : slot.slotId
          )}
          onClear={() => clearSkillSlot(slot.slotId)}
          onCast={() => castSkill(slot.slotId)}
          onDieClick={(dieIndex) => unassignDieFromSkill(dieIndex)}
          onDropDie={(dieIndex) => {
            assignDieToSkill(dieIndex, slot.slotId);
            // Don't auto-disarm — let the player stack multiple dice in
            // succession. Re-clicking the card is the disarm action.
          }}
        />
      ))}
    </div>
  );
}

function SkillCard({
  slot,
  dice,
  armed,
  canEdit,
  onArm,
  onClear,
  onCast,
  onDieClick,
  onDropDie,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [definition, setDefinition] = useState(undefined);
  const skill = SKILLS[slot.skillId];
  if (!skill) return null;

  const isOnCD = slot.cooldownLeft > 0;
  const assignedDice = slot.assignedDice
    .map((idx) => dice.find((d) => d.dieIndex === idx))
    .filter(Boolean);

  // Resolve slot count for display: range tuple vs fixed
  const slotsMin = Array.isArray(skill.slots) ? skill.slots[0] : skill.slots;
  const slotsMax = Array.isArray(skill.slots) ? skill.slots[1] : skill.slots;
  const slotsDisplay = slotsMin === slotsMax ? `${slotsMin}글자` : `${slotsMin}-${slotsMax}글자`;

  const word = assignedDice.map((d) => d.face).join("");
  let validation = { ok: false, reason: "" };
  if (assignedDice.length >= slotsMin && assignedDice.length <= slotsMax) {
    // In-range — defer to the skill's gating condition (word / same-letter /
    // vowel-count / etc.). Each condition encodes its own failure hint.
    validation = validateSkillCondition(skill, assignedDice);
  } else if (assignedDice.length < slotsMin) {
    validation = { ok: false, reason: `${slotsMin - assignedDice.length}개 더` };
  }

  const canCast = canEdit && !isOnCD && validation.ok;

  // === Definition lookup ===
  // When a valid English word is assembled (skill.requireWord + valid),
  // fetch a brief definition from the online dictionary so the player can
  // learn what they just spelled. State values:
  //   undefined → not yet fetched (show nothing or "조회 중...")
  //   null      → fetched, no definition available
  //   object    → { definition, partOfSpeech } ready to show
  const lookupWord = skill.requireWord && validation.ok ? word : "";
  useEffect(() => {
    if (!lookupWord) {
      setDefinition(undefined);
      return;
    }
    const cached = getCachedDefinition(lookupWord);
    if (cached !== undefined) {
      setDefinition(cached);
      return;
    }
    let cancelled = false;
    setDefinition(undefined);
    fetchWordDefinition(lookupWord).then((result) => {
      if (!cancelled) setDefinition(result);
    });
    return () => {
      cancelled = true;
    };
  }, [lookupWord]);

  // Render slot boxes — fixed count for now (use slotsMax for range skills).
  const visualSlotCount = slotsMax;
  const slotBoxes = [];
  for (let i = 0; i < visualSlotCount; i++) {
    const die = assignedDice[i];
    slotBoxes.push(
      <div
        key={i}
        style={{
          ...styles.slotBox,
          background: die ? "#e8b923" : "transparent",
          borderStyle: die ? "solid" : i < slotsMin ? "solid" : "dashed",
          opacity: die ? 1 : i < slotsMin ? 1 : 0.5,
        }}
        onClick={(e) => {
          if (!die || !canEdit) return;
          // Clicking an assigned die unassigns it. Stop here so the click
          // doesn't bubble up and re-arm/disarm the skill card.
          e.stopPropagation();
          onDieClick(die.dieIndex);
        }}
      >
        {die ? die.face : ""}
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.card,
        background: isOnCD
          ? "linear-gradient(180deg, #3a3025 0%, #1f1812 100%)"
          : "linear-gradient(180deg, #f7e9c0 0%, #e6d4a3 100%)",
        color: isOnCD ? "#8a7050" : "#1a1410",
        borderColor: armed ? "#ffd700" : "#1a1410",
        boxShadow: armed
          ? "0 0 0 3px #ffd700, 4px 4px 0 rgba(0,0,0,0.5)"
          : "4px 4px 0 rgba(0,0,0,0.5)",
        animation: armed ? "pulse 800ms ease-in-out infinite" : "none",
        opacity: isOnCD ? 0.55 : 1,
      }}
      onClick={(e) => {
        // Anywhere on the card (other than sub-buttons that stopPropagation)
        // arms/disarms the skill. This is what makes "click skill → click die"
        // work — the skill needs to be armed first, and forcing the user to
        // hit a sliver of empty card background was a usability problem.
        if (canEdit && !isOnCD) onArm();
      }}
      onDragOver={(e) => {
        if (!canEdit || isOnCD) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (!canEdit || isOnCD) return;
        const raw = e.dataTransfer.getData("application/x-die");
        if (!raw) return;
        const dieIndex = parseInt(raw, 10);
        if (Number.isFinite(dieIndex)) onDropDie(dieIndex);
      }}
    >
      <div style={styles.cardHeader}>
        <Icon src={skill.icon} size={22} />
        <div style={styles.cardTitle}>
          <div style={styles.cardName}>{skill.name}</div>
          <div style={styles.cardSlots}>
            {slotsDisplay}
            {(() => {
              // Show non-word condition as a small badge after slot count.
              // Skip for plain requireWord skills since "영단어" repeats the
              // dictionary-check vibe everyone already expects.
              const cond = describeSkillCondition(skill);
              if (!cond || cond === "영단어") return null;
              return (
                <span style={styles.conditionTag}>· {cond}</span>
              );
            })()}
          </div>
        </div>
        {skill.cooldown > 0 && (
          <div style={isOnCD ? styles.cooldownBadgeActive : styles.cooldownBadge}>
            {isOnCD ? (
              <>
                <img
                  src="/ui/card/time.png"
                  alt=""
                  style={{ width: 12, height: 12, verticalAlign: "middle", marginRight: 3 }}
                />
                {slot.cooldownLeft}
              </>
            ) : (
              `CD ${skill.cooldown}`
            )}
          </div>
        )}
      </div>

      <div style={{
        ...styles.cardSlotRow,
        outline: dragOver ? "2px dashed #ffd700" : "none",
      }}>
        {slotBoxes}
      </div>

      {assignedDice.length > 0 && (
        <div style={styles.cardWord}>
          <div style={styles.cardWordRow}>
            <span style={styles.cardWordText}>{word}</span>
            {!validation.ok && (
              <span style={styles.cardWordWarn}>{validation.reason}</span>
            )}
          </div>
          {validation.ok && skill.requireWord && (
            <div style={styles.cardWordDef}>
              {(() => {
                const ko = getKoreanMeaning(word);
                if (ko) {
                  return (
                    <>
                      <span style={styles.cardWordDefKo}>{ko}</span>
                      {definition && (
                        <span style={styles.cardWordDefText}>
                          ({definition.definition})
                        </span>
                      )}
                    </>
                  );
                }
                // No Korean entry — fall back to English-only loading/result.
                if (definition === undefined) {
                  return (
                    <span style={styles.cardWordDefLoading}>뜻 조회 중…</span>
                  );
                }
                if (definition === null) {
                  return (
                    <span style={styles.cardWordDefMissing}>정의 없음</span>
                  );
                }
                return (
                  <>
                    {definition.partOfSpeech && (
                      <span style={styles.cardWordDefPos}>
                        {definition.partOfSpeech}
                      </span>
                    )}
                    <span style={styles.cardWordDefText}>
                      {definition.definition}
                    </span>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <div style={styles.cardActions}>
        <button
          type="button"
          disabled={!canCast}
          onClick={(e) => {
            e.stopPropagation();
            onCast();
          }}
          style={{
            ...styles.castBtn,
            background: canCast
              ? "linear-gradient(180deg, #c9302c 0%, #8a1a17 100%)"
              : "#888",
            cursor: canCast ? "pointer" : "default",
            opacity: canCast ? 1 : 0.55,
          }}
        >
          발동
        </button>
        {assignedDice.length > 0 && canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            style={styles.clearBtn}
            title="이 슬롯의 다이스 모두 해제"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    flex: 1,
    display: "flex",
    gap: 8,
    alignItems: "stretch",
    overflowX: "auto",
    minWidth: 0,
  },
  card: {
    minWidth: 175,
    flex: "1 1 0",
    maxWidth: 230,
    border: "2px solid #1a1410",
    padding: "6px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontFamily: "var(--font-display)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    flex: 1,
  },
  cardName: {
    fontWeight: "bold",
    fontSize: 13,
  },
  cardSlots: {
    fontSize: 10,
    opacity: 0.7,
  },
  conditionTag: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#9d5a1f",
    marginLeft: 4,
  },
  cooldownBadge: {
    fontFamily: "var(--font-arcade)",
    fontSize: 9,
    color: "#8a7050",
    border: "1px solid #8a7050",
    padding: "1px 4px",
  },
  cooldownBadgeActive: {
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    fontWeight: "bold",
    color: "#7ad6ff",
    background: "rgba(122, 214, 255, 0.15)",
    border: "1px solid #7ad6ff",
    padding: "2px 5px",
  },
  cardSlotRow: {
    display: "flex",
    gap: 4,
    padding: 4,
    background: "rgba(0,0,0,0.15)",
    borderRadius: 2,
    minHeight: 32,
    flexWrap: "wrap",
  },
  slotBox: {
    width: 24,
    height: 24,
    border: "2px solid #1a1410",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1410",
    cursor: "pointer",
  },
  cardWord: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    letterSpacing: 1,
    minHeight: 14,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  cardWordRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  cardWordText: {
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    letterSpacing: 1,
  },
  cardWordWarn: {
    fontSize: 9,
    color: "#c9302c",
    fontFamily: "var(--font-display)",
  },
  // Inline dictionary definition. Tiny — meant to add context without
  // crowding the card. Limited to two lines via webkit-line-clamp so
  // long definitions still fit.
  cardWordDef: {
    fontFamily: "var(--font-display)",
    fontSize: 10,
    lineHeight: 1.25,
    color: "#3a2a1f",
    display: "flex",
    gap: 4,
    alignItems: "baseline",
    flexWrap: "wrap",
    // Limit height — clamp to ~2 lines so the card height stays stable.
    maxHeight: 28,
    overflow: "hidden",
  },
  cardWordDefLoading: {
    color: "#8a7050",
    fontStyle: "italic",
  },
  cardWordDefMissing: {
    color: "#8a7050",
    fontStyle: "italic",
  },
  cardWordDefPos: {
    background: "#1a1410",
    color: "#fce6ad",
    fontSize: 8,
    padding: "1px 4px",
    fontFamily: "var(--font-arcade)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardWordDefKo: {
    fontFamily: "var(--font-display)",
    fontSize: 12,
    fontWeight: "bold",
    color: "#8a1a17",
  },
  cardWordDefText: {
    flex: 1,
    minWidth: 0,
  },
  cardActions: {
    display: "flex",
    gap: 4,
    marginTop: "auto",
  },
  castBtn: {
    flex: 1,
    color: "white",
    border: "2px solid #1a1410",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.5)",
    padding: "5px",
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    fontWeight: "bold",
  },
  clearBtn: {
    background: "#3a2a1f",
    color: "white",
    border: "2px solid #1a1410",
    width: 28,
    fontFamily: "var(--font-arcade)",
    cursor: "pointer",
  },
  defendBtn: {
    minWidth: 80,
    background: "linear-gradient(180deg, #4a8fcc 0%, #1f5e8c 100%)",
    color: "white",
    border: "2px solid #1a1410",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
    padding: "6px",
    fontFamily: "var(--font-arcade)",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
    textShadow: "1px 1px 0 rgba(0,0,0,0.4)",
    lineHeight: 1.4,
  },
};
