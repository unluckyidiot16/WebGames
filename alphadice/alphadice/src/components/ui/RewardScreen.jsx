import { useState } from "react";
import { useGame, selectCharacter as pickChar } from "../../store/gameStore";
import { REWARD_DICE } from "../../data/rewardDice";
import {
  SKILLS,
  rotateShape,
  shapeBounds,
  shapeCells,
  tryPlaceSkill,
} from "../../data/skills";
import Icon from "./Icon";

// === RewardScreen ===
//
// Shown after a non-boss encounter is cleared. Lets the player pick:
//   minion tier → 1 of 3 dice
//   elite tier  → 1 of 3 skills
//   boss tier   → 1 of 3 dice AND 1 of 3 skills (last screen of the run)
//
// "Skip" is also allowed for either side (no forced pick) — sometimes the
// player's inventory is full and they'd rather not gain anything than
// take something they can't place.

export default function RewardScreen() {
  const choices = useGame((s) => s.rewardChoices);
  const character = useGame(pickChar);
  const claimReward = useGame((s) => s.claimReward);
  const inventory = useGame((s) => s.inventory);

  const [pickedDice, setPickedDice] = useState(null);
  const [pickedSkill, setPickedSkill] = useState(null);

  if (!choices || !character) return null;

  const hasDice = choices.dice.length > 0;
  const hasSkill = choices.skills.length > 0;

  // The player must pick something from each offered category (or skip it).
  // "Skip" is treated as a valid choice. The confirm button just commits
  // whatever's currently selected.
  const canConfirm =
    (!hasDice || pickedDice !== undefined) &&
    (!hasSkill || pickedSkill !== undefined);

  const tierBadge =
    choices.tier === "boss"
      ? { label: "BOSS", color: "#c9302c" }
      : choices.tier === "elite"
      ? { label: "ELITE", color: "#9d7ad6" }
      : { label: "MINION", color: "#7ad6ff" };

  return (
    <div style={styles.screen}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={{ ...styles.tierBadge, background: tierBadge.color }}>
            {tierBadge.label}
          </span>
          <span style={styles.title}>{choices.encounterLabel} 클리어!</span>
          <span style={styles.subtitle}>보상을 선택하세요</span>
        </div>

        {hasDice && (
          <RewardRow
            iconSrc="/ui/card/die.png"
            label="다이스 선택"
            sublabel="덱에 추가됩니다 (최대 10개)"
          >
            {choices.dice.map((die) => (
              <DiceCard
                key={die.id}
                die={die}
                picked={pickedDice === die.id}
                onPick={() =>
                  setPickedDice(pickedDice === die.id ? "skip" : die.id)
                }
              />
            ))}
            <SkipCard
              picked={pickedDice === "skip"}
              onPick={() => setPickedDice("skip")}
            />
          </RewardRow>
        )}

        {hasSkill && (
          <RewardRow
            iconSrc="/ui/card/magic.png"
            label="스킬 선택"
            sublabel={`인벤토리 ${inventory.width}×${inventory.height} 그리드에 자동 배치 시도`}
          >
            {choices.skills.map((skillId) => (
              <SkillCard
                key={skillId}
                skillId={skillId}
                picked={pickedSkill === skillId}
                onPick={() =>
                  setPickedSkill(pickedSkill === skillId ? "skip" : skillId)
                }
                inventory={inventory}
              />
            ))}
            <SkipCard
              picked={pickedSkill === "skip"}
              onPick={() => setPickedSkill("skip")}
            />
          </RewardRow>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={() =>
            claimReward({
              diceId: pickedDice && pickedDice !== "skip" ? pickedDice : null,
              skillId:
                pickedSkill && pickedSkill !== "skip" ? pickedSkill : null,
            })
          }
          style={{
            ...styles.confirmBtn,
            opacity: canConfirm ? 1 : 0.5,
            cursor: canConfirm ? "pointer" : "default",
          }}
        >
          확정 → 다음 전투
        </button>
      </div>
    </div>
  );
}

function RewardRow({ iconSrc, label, sublabel, children }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowHeader}>
        <span style={styles.rowLabel}>
          {iconSrc && (
            <img
              src={iconSrc}
              alt=""
              style={{
                width: 18,
                height: 18,
                verticalAlign: "middle",
                marginRight: 6,
              }}
            />
          )}
          {label}
        </span>
        <span style={styles.rowSublabel}>{sublabel}</span>
      </div>
      <div style={styles.rowCards}>{children}</div>
    </div>
  );
}

// === Dice reward card ===
function DiceCard({ die, picked, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        ...styles.card,
        ...(picked ? styles.cardPicked : {}),
      }}
    >
      <div style={styles.cardTitle}>{die.name}</div>
      <div style={styles.cardDesc}>{die.desc}</div>
      <div style={styles.diceFaces}>
        {die.sides.map((face, i) => (
          <span key={i} style={styles.dieFace}>
            {face}
          </span>
        ))}
      </div>
      <div style={styles.tierLine}>Tier {die.tier}</div>
    </button>
  );
}

// === Skill reward card with shape preview ===
function SkillCard({ skillId, picked, onPick, inventory }) {
  const skill = SKILLS[skillId];
  if (!skill) return null;

  // Try to find a placement so we can warn if it won't fit.
  const fit = tryPlaceSkill(
    skillId,
    inventory.placements,
    inventory.width,
    inventory.height,
  );

  const slotsMin = Array.isArray(skill.slots) ? skill.slots[0] : skill.slots;
  const slotsMax = Array.isArray(skill.slots) ? skill.slots[1] : skill.slots;
  const slotsDisplay =
    slotsMin === slotsMax ? `${slotsMin}글자` : `${slotsMin}-${slotsMax}글자`;

  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        ...styles.card,
        ...(picked ? styles.cardPicked : {}),
      }}
    >
      <div style={styles.skillHeader}>
        <Icon src={skill.icon} size={24} />
        <div style={styles.skillName}>{skill.name}</div>
      </div>
      <div style={styles.cardDesc}>{skill.description}</div>
      <div style={styles.skillMeta}>
        <span>{slotsDisplay}</span>
        {skill.cooldown > 0 && <span>· CD {skill.cooldown}</span>}
      </div>
      <ShapePreview shape={skill.shape} />
      {!fit && (
        <div style={styles.fitWarn}>
          ⚠ 인벤토리에 자리 없음 — 획득은 되지만 즉시 사용 불가
        </div>
      )}
    </button>
  );
}

// Tiny shape outline so the player can see Tetris size at a glance.
function ShapePreview({ shape }) {
  const cells = shapeCells(shape);
  const { w, h } = shapeBounds(shape);
  const CELL = 14;
  const GAP = 1;

  return (
    <div
      style={{
        position: "relative",
        width: w * CELL + (w - 1) * GAP,
        height: h * CELL + (h - 1) * GAP,
        margin: "8px auto 4px",
      }}
    >
      {cells.map((c) => (
        <div
          key={`${c.x},${c.y}`}
          style={{
            position: "absolute",
            left: c.x * (CELL + GAP),
            top: c.y * (CELL + GAP),
            width: CELL,
            height: CELL,
            background: "#e8b923",
            border: "1px solid #1a1410",
          }}
        />
      ))}
    </div>
  );
}

function SkipCard({ picked, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        ...styles.skipCard,
        ...(picked ? styles.cardPicked : {}),
      }}
    >
      <div style={{ fontSize: 22 }}>—</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 11 }}>
        건너뛰기
      </div>
    </button>
  );
}

const styles = {
  screen: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(180deg, #1a1410 0%, #2a1f17 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  panel: {
    background: "linear-gradient(180deg, #2e231a 0%, #1a1410 100%)",
    border: "3px solid #fce6ad",
    boxShadow: "8px 8px 0 rgba(0,0,0,0.6)",
    padding: "24px 32px",
    color: "#fce6ad",
    minWidth: 600,
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  tierBadge: {
    fontFamily: "var(--font-arcade)",
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
    padding: "3px 8px",
    border: "2px solid #1a1410",
    letterSpacing: 1,
  },
  title: {
    fontFamily: "var(--font-arcade)",
    fontSize: 18,
    fontWeight: "bold",
    color: "#e8b923",
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: "var(--font-display)",
    fontSize: 12,
    color: "#bca480",
    marginLeft: "auto",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  rowHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
  },
  rowLabel: {
    fontFamily: "var(--font-arcade)",
    fontSize: 13,
    fontWeight: "bold",
    color: "#fce6ad",
  },
  rowSublabel: {
    fontFamily: "var(--font-display)",
    fontSize: 10,
    color: "#8a7a5e",
  },
  rowCards: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  card: {
    background: "linear-gradient(180deg, #f7e9c0 0%, #e6d4a3 100%)",
    color: "#1a1410",
    border: "3px solid #1a1410",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
    padding: "10px 12px",
    flex: "1 1 160px",
    minWidth: 160,
    maxWidth: 220,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontFamily: "var(--font-display)",
  },
  cardPicked: {
    borderColor: "#e8b923",
    boxShadow: "0 0 0 3px #ffd700, 4px 4px 0 rgba(0,0,0,0.5)",
    transform: "translate(0, -2px)",
  },
  skipCard: {
    background: "rgba(255,255,255,0.05)",
    color: "#bca480",
    border: "2px dashed #bca480",
    padding: "10px 12px",
    flex: "0 0 90px",
    cursor: "pointer",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 13,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 1.3,
    opacity: 0.85,
    minHeight: 28,
  },
  diceFaces: {
    display: "flex",
    gap: 3,
    flexWrap: "wrap",
    marginTop: 4,
  },
  dieFace: {
    background: "#fff7e0",
    border: "1.5px solid #1a1410",
    width: 22,
    height: 22,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-arcade)",
    fontSize: 12,
    fontWeight: "bold",
  },
  tierLine: {
    fontSize: 10,
    fontFamily: "var(--font-arcade)",
    color: "#8a7050",
    marginTop: 4,
  },
  skillHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  skillIcon: { fontSize: 18 },
  skillName: { fontWeight: "bold", fontSize: 13 },
  skillMeta: {
    fontFamily: "var(--font-arcade)",
    fontSize: 9,
    color: "#5a4a3a",
    display: "flex",
    gap: 6,
  },
  fitWarn: {
    fontSize: 10,
    color: "#c9302c",
    background: "rgba(201,48,44,0.1)",
    padding: "3px 6px",
    border: "1px solid #c9302c",
    marginTop: 4,
    fontFamily: "var(--font-display)",
  },
  confirmBtn: {
    background: "linear-gradient(180deg, #c9302c 0%, #8a1a17 100%)",
    color: "white",
    border: "3px solid #1a1410",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
    padding: "10px 14px",
    fontFamily: "var(--font-arcade)",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    alignSelf: "flex-end",
  },
};
