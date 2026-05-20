import { create } from "zustand";
import { CHARACTERS } from "../data/characters";
import { ENEMIES } from "../data/enemies";
import { RUN_MAP, getNode, isBossNode } from "../data/runMap";
import {
  SKILLS,
  STARTING_LOADOUTS,
  packSkillsIntoGrid,
  tryPlaceSkill,
  pickRewardSkillChoices,
} from "../data/skills";
import { REWARD_DICE, pickRewardDiceChoices } from "../data/rewardDice";
import { rollDice, rerollUnlocked, computeDamage } from "../utils/dice";
import { isValidWord } from "../data/dictionary";
import { validateSkillCondition } from "../data/skillConditions";
import { playPlayerAttackSequence, playEnemyTurnSequence } from "../utils/sequence";
import { recordVictory, recordAttempt } from "../utils/profile";
import { CHARACTER_SIGNATURES, SIGNATURES } from "../data/signatures";
import { playSignatureSequence } from "../utils/sequence";

const initialState = {
  // phase values:
  //   "select"  — character select screen
  //   "map"     — between-encounter node picker
  //   "battle"  — fighting an encounter
  //   "reward"  — picking rewards after a battle
  //   "victory" — final boss cleared (run complete)
  //   "defeat"  — player HP hit 0
  phase: "select",
  turnState: "player_turn",
  turnNumber: 1,

  // Player
  characterId: null,
  playerHP: 0,
  playerMaxHP: 0,
  playerShield: 0,

  // Class signature ability — fueled by playing words. Gauge fills 1 per
  // letter spelled; at max the SignatureCard activates. After cast, gauge
  // resets to 0 and starts filling again. Persists across battles within
  // a run (resets on new run start via initialState).
  playerGauge: 0,
  playerGaugeMax: 10,
  signatureId: null,           // resolved from character on run start

  // Dice state
  // `diceDeck` is the player's roster of dice templates — what they OWN.
  // Starts at 5 (CHARACTER startingDice), grows up to DICE_MAX as they
  // collect dice rewards from dungeon progression. Each entry is a 6-element
  // array of letters (duplicates allowed). Templates are stable across
  // a run — only the rolled faces (`dice`) change each turn.
  diceDeck: [],              // [['A','A','E','I','O','U'], ...]
  dice: [],                  // [{ dieIndex, face, locked, used, skillSlotId }]
  rerollsUsed: 0,
  rerollsMax: 1,
  convertUsed: false,

  // Skill instances on the player's loadout.
  // [{ slotId, skillId, cooldownLeft, assignedDice: [dieIndex, ...] }]
  // A skill instance is "active" iff it also has a corresponding entry in
  // `inventory.placements`. castSkill enforces this — out-of-inventory
  // skills are not castable. For Phase 2 placements are filled in at
  // selectCharacter and never changed mid-battle; Phase 3 will add a
  // reward-screen UI that lets the player rearrange between encounters.
  skillSlots: [],

  // Grid inventory state (Phase 2)
  //   width / height — grid dimensions, expandable via rewards
  //   placements — [{ skillId, x, y, rotation }], one per active skill.
  //                (x, y) is the top-left corner of the skill's footprint
  //                in grid coordinates; rotation is 0..3 (0°..270° CW).
  inventory: {
    width: 3,
    height: 3,
    placements: [],
  },

  // Enemies
  enemies: [],
  targetIndex: 0,

  // Run progression (Phase 3/4)
  //   currentNodeId — node the player is currently AT. When phase==="map",
  //                   this is where the player just was (visited); they
  //                   click an outgoing edge to advance. When phase==="battle"
  //                   this is the node being played.
  //   visited       — Set of node ids the player has cleared (battles won,
  //                   rests claimed). The MapScreen greys these out.
  //   rewardChoices — populated when phase === "reward". Shape:
  //                   { tier, encounterLabel, dice: [...], skills: [...] }
  run: {
    currentNodeId: null,
    visited: [],
  },
  rewardChoices: null,

  // Active in-flight projectiles
  projectiles: [],

  // Visual cues
  floatingTexts: [],
  shakingEntity: null,
  playerAnim: "idle",
  enemyAttackingIndex: null,

  // Dash animation state — non-null during an attack lunge/return.
  //   { targetX, targetZ, phase: "out"|"hold"|"back", startTime, duration }
  // PlayerCharacter useFrame samples this every frame and interpolates
  // the model's position offset. sequence.js owns the lifecycle (sets
  // it, advances phases, clears it).
  playerDash: null,

  // UI feedback
  lastWordResult: null,
  message: "",
};

// Build a list of live enemy instances from an encounter definition.
// Pulled into a helper so it's reused on every encounter advance, not just
// the initial selectCharacter spawn.
function spawnEnemiesForEncounter(encounter) {
  return encounter.enemies.map((spawn, i) => {
    const def = ENEMIES[spawn.type];
    return {
      id: `enemy_${i}`,
      type: spawn.type,
      name: def.name,
      hp: def.hp,
      maxHp: def.hp,
      damage: def.damage,
      x: spawn.x,
      z: spawn.z ?? -0.5,
      alive: true,
      attackType: def.attackType || "melee",
      attackAnim: def.attackAnim || "MELEE_BASIC",
      windupMs: def.windupMs ?? 500,
      projectileMs: def.projectileMs ?? 450,
      projectileKind: def.projectileKind || "magic_bolt",
      dodgeChance: def.dodgeChance ?? 0,
      attackCountdownMax: def.attackCountdown ?? 2,
      attackCountdownCurrent: def.attackCountdown ?? 2,
      // [{ kind: "dot"|"burn", damage, turnsLeft }]
      statusEffects: [],
    };
  });
}

export const useGame = create((set, get) => ({
  ...initialState,

  // === Character selection ===
  selectCharacter: (characterId) => {
    const char = CHARACTERS[characterId];
    if (!char) return;

    // Build starting skill loadout
    const loadout = STARTING_LOADOUTS[characterId] || ["basic_attack"];
    const skillSlots = loadout.map((skillId, i) => ({
      slotId: `slot_${i}`,
      skillId,
      cooldownLeft: 0,
      assignedDice: [],
    }));

    // Auto-place skills into the starting 3×3 inventory grid.
    // basic_attack is always available without taking up grid space — it's
    // the always-on "free" skill. Only class skills + future reward skills
    // occupy inventory cells.
    const INV_W = initialState.inventory.width;
    const INV_H = initialState.inventory.height;
    const inventorySkills = loadout.filter((id) => id !== "basic_attack");
    const { placements, unplaced } = packSkillsIntoGrid(
      inventorySkills,
      INV_W,
      INV_H,
    );
    if (unplaced.length > 0) {
      console.warn(
        `[inventory] ${characterId}: could not fit ${unplaced.join(", ")} into ${INV_W}×${INV_H} grid`,
      );
    }

    const diceDeck = char.startingDice.map((sides) => [...sides]);

    set({
      ...initialState,
      // Start ON the map, not in a fight — player picks their first node.
      phase: "map",
      characterId,
      playerHP: char.hp,
      playerMaxHP: char.hp,
      enemies: [],
      targetIndex: 0,
      diceDeck,
      dice: [],
      rerollsMax: char.skill.maxRerolls || 1,
      skillSlots,
      inventory: { width: INV_W, height: INV_H, placements },
      signatureId: CHARACTER_SIGNATURES[characterId] || null,
      run: {
        currentNodeId: RUN_MAP.startNodeId,
        // Start node is "visited" so the player can't loop back to it.
        visited: [RUN_MAP.startNodeId],
      },
      message: `${char.name}의 모험이 시작된다!`,
    });
    recordAttempt(characterId);
  },

  // === Run progression (Phase 4A — node map) ===

  // The player picks an outgoing node from the current location. Validates
  // the edge, then either applies a rest heal in-place or transitions to
  // a battle.
  chooseMapNode: (targetNodeId) => {
    const { run, phase, playerHP, playerMaxHP } = get();
    if (phase !== "map") return;
    const current = getNode(run.currentNodeId);
    if (!current) return;
    if (!current.next.includes(targetNodeId)) return;
    if (run.visited.includes(targetNodeId)) return;
    const target = getNode(targetNodeId);
    if (!target) return;

    if (target.type === "rest") {
      // Rest = heal 40% max HP, mark visited, stay in map phase.
      const healAmount = Math.floor(playerMaxHP * 0.4);
      const healedHP = Math.min(playerMaxHP, playerHP + healAmount);
      set({
        run: {
          currentNodeId: targetNodeId,
          visited: [...run.visited, targetNodeId],
        },
        playerHP: healedHP,
        message:
          healedHP > playerHP
            ? `쉼터 — ${healedHP - playerHP} HP 회복`
            : `쉼터 — 이미 만체력`,
      });
      return;
    }

    if (target.type === "event") {
      // STUB: event nodes will get full narrative content in Sprint 6.
      // For now they grant a small heal so they're meaningfully different
      // from rest (40%) and feel like a "lighter" alternative.
      const healAmount = Math.floor(playerMaxHP * 0.2);
      const healedHP = Math.min(playerMaxHP, playerHP + healAmount);
      set({
        run: {
          currentNodeId: targetNodeId,
          visited: [...run.visited, targetNodeId],
        },
        playerHP: healedHP,
        message: `${target.label} — 잠시 멈춰 갔다 (+${healedHP - playerHP} HP)`,
      });
      return;
    }

    // Battle / elite / boss → set up the fight.
    const encounter = target.encounter;
    if (!encounter) {
      console.warn("[map] node has no encounter:", targetNodeId);
      return;
    }
    const enemies = spawnEnemiesForEncounter(encounter);
    const { diceDeck, skillSlots } = get();

    set({
      phase: "battle",
      turnState: "player_turn",
      turnNumber: 1,
      run: {
        currentNodeId: targetNodeId,
        visited: run.visited, // mark visited only on win, not on entry
      },
      enemies,
      targetIndex: 0,
      dice: rollDice(diceDeck),
      rerollsUsed: 0,
      convertUsed: false,
      playerShield: 0,
      playerAnim: "idle",
      playerDash: null,
      skillSlots: skillSlots.map((s) => ({
        ...s,
        assignedDice: [],
        cooldownLeft: 0,
      })),
      projectiles: [],
      floatingTexts: [],
      shakingEntity: null,
      enemyAttackingIndex: null,
      lastWordResult: null,
      message: `${target.label} — 시작!`,
    });
  },

  // === Inventory rearrangement (Phase 4A-2 — bag system) ===
  //
  // The "bag" is implicit: it's every skillSlots entry whose skillId isn't
  // in inventory.placements (and isn't basic_attack, which is always free).
  // These actions let the player move skills between the bag and the grid
  // on the map screen.

  // Try to place a skill currently in the bag onto the grid. If no rotation
  // fits anywhere, the action no-ops with a status message.
  equipSkill: (skillId) => {
    const { phase, inventory, skillSlots } = get();
    if (phase !== "map") return;
    // Already equipped — no-op.
    if (inventory.placements.some((p) => p.skillId === skillId)) return;
    // Must own the skill (be in skillSlots).
    if (!skillSlots.some((s) => s.skillId === skillId)) return;
    const fit = tryPlaceSkill(
      skillId,
      inventory.placements,
      inventory.width,
      inventory.height,
    );
    if (!fit) {
      set({ message: "공간이 부족해. 다른 스킬을 먼저 빼봐." });
      return;
    }
    set({
      inventory: {
        ...inventory,
        placements: [...inventory.placements, { skillId, ...fit }],
      },
      message: "",
    });
  },

  // Remove a skill from the grid (move back to bag). basic_attack is never
  // on the grid so this is a no-op for it.
  unequipSkill: (skillId) => {
    const { phase, inventory } = get();
    if (phase !== "map") return;
    if (skillId === "basic_attack") return;
    set({
      inventory: {
        ...inventory,
        placements: inventory.placements.filter((p) => p.skillId !== skillId),
      },
      message: "",
    });
  },


  // Called by the sequencer when an encounter is cleared. Populates
  // rewardChoices based on the cleared node's tier, then flips phase
  // to "reward". The node is marked visited so the map screen can show
  // it as done.
  _enterRewardPhase: () => {
    const { run, characterId, skillSlots } = get();
    const node = getNode(run.currentNodeId);
    const encounter = node?.encounter;
    const tier = encounter?.tier || "minion";

    const ownedSkillIds = skillSlots.map((s) => s.skillId);
    const giveDice = tier === "minion" || tier === "boss";
    const giveSkill = tier === "elite" || tier === "boss";

    const choices = {
      tier,
      encounterLabel: node?.label || "",
      dice: giveDice ? pickRewardDiceChoices(characterId, 3) : [],
      skills: giveSkill
        ? pickRewardSkillChoices(characterId, ownedSkillIds, 3)
        : [],
    };

    set({
      phase: "reward",
      rewardChoices: choices,
      // Mark this node as cleared (visited) on the map.
      run: {
        ...run,
        visited: run.visited.includes(run.currentNodeId)
          ? run.visited
          : [...run.visited, run.currentNodeId],
      },
    });
  },

  // Apply the player's chosen rewards. Each kind is optional — minion
  // encounters pass only `diceId`, elite only `skillId`, boss both. After
  // applying, this action returns to the map (or flips to victory if the
  // cleared encounter was the boss).
  //
  // No auto-heal between encounters anymore — the player heals via Rest
  // nodes on the map, which is the whole point of Phase 4A.
  claimReward: ({ diceId, skillId } = {}) => {
    const {
      diceDeck,
      skillSlots,
      inventory,
      run,
    } = get();

    let newDiceDeck = diceDeck;
    let newSkillSlots = skillSlots;
    let newPlacements = inventory.placements;

    // Dice reward → append to deck (capped at 10 dice).
    if (diceId) {
      const def = REWARD_DICE.find((d) => d.id === diceId);
      if (def && newDiceDeck.length < 10) {
        newDiceDeck = [...newDiceDeck, [...def.sides]];
      }
    }

    // Skill reward → add a slot AND auto-place if there's room. If the
    // grid is full we still record ownership; the unplaced skill simply
    // can't be cast yet (castSkill gates by inventory.placements). The
    // future rearrange UI will let the player swap things around.
    if (skillId && SKILLS[skillId]) {
      const newSlotId = `slot_${newSkillSlots.length}`;
      newSkillSlots = [
        ...newSkillSlots,
        {
          slotId: newSlotId,
          skillId,
          cooldownLeft: 0,
          assignedDice: [],
        },
      ];
      const fit = tryPlaceSkill(
        skillId,
        newPlacements,
        inventory.width,
        inventory.height,
      );
      if (fit) {
        newPlacements = [...newPlacements, { skillId, ...fit }];
      }
    }

    // Boss clear → run victory. Otherwise return to the map for next pick.
    const wasBoss = isBossNode(run.currentNodeId);
    if (wasBoss) {
      const { characterId } = get();
      if (characterId) recordVictory(characterId);
      set({
        phase: "victory",
        diceDeck: newDiceDeck,
        skillSlots: newSkillSlots,
        inventory: { ...inventory, placements: newPlacements },
        rewardChoices: null,
      });
      return;
    }

    set({
      phase: "map",
      rewardChoices: null,
      diceDeck: newDiceDeck,
      skillSlots: newSkillSlots,
      inventory: { ...inventory, placements: newPlacements },
      // Clear the just-fought battle's transient state so the map screen
      // isn't showing stale enemies behind it if anything peeks through.
      enemies: [],
      dice: [],
      projectiles: [],
      shakingEntity: null,
      enemyAttackingIndex: null,
      lastWordResult: null,
      message: "",
    });
  },

  // === Dice manipulation ===
  rerollAll: () => {
    const { dice, diceDeck, rerollsUsed, rerollsMax, turnState } = get();
    if (turnState !== "player_turn") return;
    if (rerollsUsed >= rerollsMax) return;
    set({
      dice: rerollUnlocked(dice, diceDeck),
      rerollsUsed: rerollsUsed + 1,
    });
  },

  toggleLock: (dieIndex) => {
    const { dice, turnState } = get();
    if (turnState !== "player_turn") return;
    set({
      dice: dice.map((d) =>
        d.dieIndex === dieIndex && !d.used ? { ...d, locked: !d.locked } : d
      ),
    });
  },

  // === Deck management — used by reward UI between encounters ===
  //
  // addDie(sides): append a new 6-face die template to the deck (rejects
  //   if already at DICE_MAX). Used after killing a minion-tier enemy.
  // removeDieFromDeck(index): drop a die from the deck (rejects if at
  //   DICE_MIN). Used by future "delete die" rewards.
  addDie: (sides) => {
    const { diceDeck } = get();
    // Hard cap so the UI doesn't go off the rails
    if (diceDeck.length >= 10) return false;
    if (!Array.isArray(sides) || sides.length !== 6) return false;
    const cleaned = sides.map((s) => String(s).toUpperCase().slice(0, 1));
    set({ diceDeck: [...diceDeck, cleaned] });
    return true;
  },

  removeDieFromDeck: (deckIndex) => {
    const { diceDeck } = get();
    if (diceDeck.length <= 3) return false;
    if (deckIndex < 0 || deckIndex >= diceDeck.length) return false;
    set({
      diceDeck: diceDeck.filter((_, i) => i !== deckIndex),
    });
    return true;
  },

  // Mage: convert a die's face to a chosen letter
  convertDie: (dieIndex, letter) => {
    const { dice, convertUsed, characterId, turnState } = get();
    if (turnState !== "player_turn") return;
    if (convertUsed) return;
    const char = CHARACTERS[characterId];
    if (!char.skill.convertOne) return;
    set({
      dice: dice.map((d) =>
        d.dieIndex === dieIndex && !d.used
          ? { ...d, face: letter.toUpperCase() }
          : d
      ),
      convertUsed: true,
    });
  },

  // === Skill slot routing (new core system) ===
  //
  // A die can be in exactly one of these states:
  //   free                 (used=false, skillSlotId=null)
  //   locked               (locked=true, otherwise free)
  //   in skill slot        (skillSlotId="slot_..", used=true)
  //
  // assignDieToSkill enforces this — if the die was somewhere else, it gets
  // cleanly removed before being attached to the skill slot.

  assignDieToSkill: (dieIndex, slotId) => {
    const { dice, skillSlots, turnState } = get();
    if (turnState !== "player_turn") return;
    const die = dice.find((d) => d.dieIndex === dieIndex);
    const slot = skillSlots.find((s) => s.slotId === slotId);
    if (!die || !slot) return;
    if (slot.cooldownLeft > 0) return;
    const skill = SKILLS[slot.skillId];
    if (!skill) return;

    // Check capacity
    const { max } = (() => {
      if (Array.isArray(skill.slots)) return { max: skill.slots[1] };
      return { max: skill.slots };
    })();
    if (slot.assignedDice.length >= max && !slot.assignedDice.includes(dieIndex)) {
      // Slot already full — refuse (UI should make capacity visible)
      return;
    }

    // If die is already in THIS slot, do nothing (no-op click)
    if (die.skillSlotId === slotId) return;

    // Detach from any previous skill slot
    const prevSlotId = die.skillSlotId;

    const newSkillSlots = skillSlots.map((s) => {
      // Remove from previous skill slot
      if (s.slotId === prevSlotId) {
        return { ...s, assignedDice: s.assignedDice.filter((i) => i !== dieIndex) };
      }
      // Add to new slot
      if (s.slotId === slotId) {
        return { ...s, assignedDice: [...s.assignedDice, dieIndex] };
      }
      return s;
    });

    const newDice = dice.map((d) =>
      d.dieIndex === dieIndex
        ? { ...d, used: true, skillSlotId: slotId }
        : d
    );

    set({ skillSlots: newSkillSlots, dice: newDice });
  },

  // Remove a die from whichever skill slot it's in (no-op if not in one).
  unassignDieFromSkill: (dieIndex) => {
    const { dice, skillSlots, turnState } = get();
    if (turnState !== "player_turn") return;
    const die = dice.find((d) => d.dieIndex === dieIndex);
    if (!die || !die.skillSlotId) return;
    const slotId = die.skillSlotId;

    set({
      skillSlots: skillSlots.map((s) =>
        s.slotId === slotId
          ? { ...s, assignedDice: s.assignedDice.filter((i) => i !== dieIndex) }
          : s
      ),
      dice: dice.map((d) =>
        d.dieIndex === dieIndex
          ? { ...d, used: false, skillSlotId: null }
          : d
      ),
    });
  },

  // Empty a whole skill slot.
  clearSkillSlot: (slotId) => {
    const { dice, skillSlots, turnState } = get();
    if (turnState !== "player_turn") return;
    const slot = skillSlots.find((s) => s.slotId === slotId);
    if (!slot || slot.assignedDice.length === 0) return;
    const indices = new Set(slot.assignedDice);

    set({
      skillSlots: skillSlots.map((s) =>
        s.slotId === slotId ? { ...s, assignedDice: [] } : s
      ),
      dice: dice.map((d) =>
        indices.has(d.dieIndex) ? { ...d, used: false, skillSlotId: null } : d
      ),
    });
  },

  // Reorder dice within a skill slot (for word-forming order). Pass the new
  // ordered list of dieIndices.
  reorderSkillSlot: (slotId, newOrder) => {
    const { skillSlots, turnState } = get();
    if (turnState !== "player_turn") return;
    const slot = skillSlots.find((s) => s.slotId === slotId);
    if (!slot) return;
    // Only allow if the set of dice is the same — paranoia check
    const sameSet =
      newOrder.length === slot.assignedDice.length &&
      newOrder.every((i) => slot.assignedDice.includes(i));
    if (!sameSet) return;
    set({
      skillSlots: skillSlots.map((s) =>
        s.slotId === slotId ? { ...s, assignedDice: newOrder } : s
      ),
    });
  },

  // === Cast a skill — replaces the old `attack` action ===
  castSkill: (slotId) => {
    const state = get();
    if (state.turnState !== "player_turn") return;
    const slot = state.skillSlots.find((s) => s.slotId === slotId);
    if (!slot) return;
    // Inventory gate: skills must be placed on the grid to be castable —
    // except basic_attack, which is the always-on free skill outside the
    // inventory system. Reward skills that don't fit go to the bag and
    // can't be cast until the player rearranges via the map's inventory UI.
    const isBasic = slot.skillId === "basic_attack";
    const placed =
      isBasic ||
      state.inventory.placements.some((p) => p.skillId === slot.skillId);
    if (!placed) {
      set({ message: "스킬이 인벤토리에 없어! (가방에서 장착하기)" });
      return;
    }
    if (slot.cooldownLeft > 0) {
      set({ message: `쿨다운 ${slot.cooldownLeft}턴 남음` });
      return;
    }
    const skill = SKILLS[slot.skillId];
    if (!skill) return;

    // Resolve dice in slot order → word
    const assignedDice = slot.assignedDice
      .map((idx) => state.dice.find((d) => d.dieIndex === idx))
      .filter(Boolean);

    // Validate count
    const { min, max } = (() => {
      if (Array.isArray(skill.slots)) return { min: skill.slots[0], max: skill.slots[1] };
      return { min: skill.slots, max: skill.slots };
    })();
    if (assignedDice.length < min) {
      set({ message: `다이스 ${min}개 필요!` });
      return;
    }
    if (assignedDice.length > max) {
      set({ message: `다이스 ${max}개까지!` });
      return;
    }

    const word = assignedDice.map((d) => d.face).join("");

    // Validate the skill's gating condition (requireWord OR
    // requireSameLetter OR requireVowels OR requireConsonants). Each
    // condition type returns its own failure message.
    const validation = validateSkillCondition(skill, assignedDice);
    if (!validation.ok) {
      // requireWord-style failures show the assembled letters; other
      // conditions show a generic hint since "letter count off" doesn't
      // need the word echoed back.
      const msg = skill.requireWord
        ? `"${word}" — 사전에 없어!`
        : `조건 미충족: ${validation.reason}`;
      set({
        lastWordResult: { word, valid: false, damage: 0 },
        message: msg,
        floatingTexts: [
          ...state.floatingTexts,
          {
            id: `txt_${Date.now()}`,
            text: "✗",
            color: "#888",
            anchor: "word",
            ts: Date.now(),
          },
        ],
      });
      return;
    }

    // Pick target (fallback if dead)
    let targetIdx = state.targetIndex;
    if (skill.targeting === "single") {
      if (!state.enemies[targetIdx] || !state.enemies[targetIdx].alive) {
        targetIdx = state.enemies.findIndex((e) => e.alive);
        if (targetIdx === -1) return;
        set({ targetIndex: targetIdx });
      }
    }

    // Set cooldown on the slot AND clear its docked dice so the same
    // skill can't be fired again with the same dice. The dice keep
    // `used: true` so they can't be assigned to a different skill either
    // — they're spent for this turn. The visual "spent" treatment lives
    // in DiceTray (greyed-out red color when used=true).
    //
    // Also charge the signature gauge — one tick per letter spelled.
    // We clamp at gaugeMax so it doesn't visually overflow; the surplus
    // is wasted, which gives "save it for big words" a slight edge over
    // "spam 3-letter chains".
    const gaugeNext = Math.min(
      state.playerGaugeMax,
      state.playerGauge + word.length,
    );
    set({
      skillSlots: state.skillSlots.map((s) =>
        s.slotId === slotId
          ? { ...s, cooldownLeft: skill.cooldown, assignedDice: [] }
          : s
      ),
      dice: state.dice.map((d) =>
        slot.assignedDice.includes(d.dieIndex)
          ? { ...d, skillSlotId: null } // keep used:true; just detach from slot
          : d
      ),
      playerGauge: gaugeNext,
    });

    const char = CHARACTERS[state.characterId];
    const tier = word.length >= 6 ? "Special" : char.attackAnim;

    // Hand off to the sequencer. We pass the skill metadata so the runner
    // can apply non-damage effects (stun, shield, dot, etc).
    playPlayerAttackSequence({
      get,
      set,
      word,
      // Pass the raw skill so the sequencer can iterate effects
      skill,
      assignedDieIndices: slot.assignedDice.slice(),
      targetIdx,
      charId: state.characterId,
      tier,
    });
  },

  // === Targeting ===
  setTarget: (idx) => {
    const { enemies, turnState } = get();
    if (turnState !== "player_turn") return;
    if (!enemies[idx] || !enemies[idx].alive) return;
    set({ targetIndex: idx });
  },

  // === Advance to next turn (called by sequencer) ===
  _advanceTurn: () => {
    const { diceDeck, enemies, turnNumber, skillSlots } = get();
    const firstAlive = enemies.findIndex((e) => e.alive);
    set({
      dice: rollDice(diceDeck),
      rerollsUsed: 0,
      convertUsed: false,
      // Clear all skill slots (assigned dice) — fresh dice anyway.
      skillSlots: skillSlots.map((s) => ({
        ...s,
        assignedDice: [],
        // Tick cooldowns down by 1.
        cooldownLeft: Math.max(0, s.cooldownLeft - 1),
      })),
      turnState: "player_turn",
      turnNumber: turnNumber + 1,
      targetIndex: firstAlive >= 0 ? firstAlive : 0,
      lastWordResult: null,
      message: `턴 ${turnNumber + 1} — 다이스 굴림!`,
    });
  },

  // === Cast signature ability ===
  // Class ult. No dice or word required — just needs the gauge full.
  // After cast, gauge resets to 0 and starts charging from scratch.
  // The actual effect runs through playSignatureSequence so it can do
  // animations / floating text / camera work like a regular skill.
  castSignature: () => {
    const state = get();
    if (state.turnState !== "player_turn") return;
    if (state.playerGauge < state.playerGaugeMax) return;
    if (!state.signatureId) return;
    const signature = SIGNATURES[state.signatureId];
    if (!signature) return;

    // Reset gauge immediately so the UI can't double-fire while the
    // animation is playing. The effect itself is handled in the
    // sequencer — see playSignatureSequence in utils/sequence.js.
    set({
      playerGauge: 0,
      turnState: "player_attack",
      message: `${signature.name}!`,
    });
    playSignatureSequence({ get, set, signature });
  },

  // === Skip turn (player has no playable word) ===
  // Hands control to the enemies without attacking. Clears any assigned
  // dice first so they don't carry forward into the next turn. The enemy
  // sequencer ends by calling _advanceTurn which re-rolls dice and ticks
  // Explicit end-of-turn. Cleans up any in-progress dice assignments
  // (dice that were docked into a skill slot but never fired), then hands
  // off to the enemy turn. After enemy actions resolve, the next player
  // turn re-rolls all non-locked dice and ticks cooldowns automatically.
  //
  // Name kept as `skipTurn` for backward-compat with callers; semantics
  // now cover both "I can't act, skip me" and "I'm done casting, go".
  skipTurn: () => {
    const { turnState, skillSlots } = get();
    if (turnState !== "player_turn") return;
    set({
      turnState: "enemy_turn",
      // Drop any in-progress dice assignments (un-cast dice on slots).
      skillSlots: skillSlots.map((s) => ({ ...s, assignedDice: [] })),
      dice: get().dice.map((d) =>
        d.skillSlotId && !d.used ? { ...d, skillSlotId: null } : d,
      ),
      message: "턴 종료 — 적의 차례",
    });
    playEnemyTurnSequence({ get, set });
  },

  // ============================================================
  // === DEV-MODE ACTIONS ===
  // These are only invoked from the DevPanel UI (which is mounted only
  // when isDevModeEnabled() returns true). They bypass normal game-flow
  // restrictions to enable testing/debugging.
  // ============================================================

  // Set the player's HP to an exact value (clamped to maxHP).
  devSetPlayerHP: (hp) => {
    const max = get().playerMaxHP;
    set({ playerHP: Math.max(0, Math.min(max, hp)) });
  },

  // Set a specific enemy's HP. Pass index in enemies[]. Use 0 to "instakill"
  // (which also flips alive=false so the sequencer treats it as dead).
  devSetEnemyHP: (enemyIndex, hp) => {
    const enemies = [...get().enemies];
    if (!enemies[enemyIndex]) return;
    const max = enemies[enemyIndex].maxHp;
    const clamped = Math.max(0, Math.min(max, hp));
    enemies[enemyIndex] = {
      ...enemies[enemyIndex],
      hp: clamped,
      alive: clamped > 0,
    };
    set({ enemies });
  },

  // Kill every enemy in the current encounter. Mirrors a "boss instakill"
  // shortcut — useful for skipping past content while testing reward flow.
  devKillAllEnemies: () => {
    const enemies = get().enemies.map((e) => ({ ...e, hp: 0, alive: false }));
    set({ enemies });
  },

  // Replace a specific die's current face. Doesn't modify the underlying
  // dieDeck — just the rolled face for this turn.
  devSetDieFace: (dieIndex, face) => {
    const dice = get().dice.map((d) =>
      d.dieIndex === dieIndex ? { ...d, face: face.toUpperCase() } : d,
    );
    set({ dice });
  },

  // Set ALL dice to the same face. Handy for testing same-letter skills.
  devSetAllDiceFaces: (face) => {
    const f = face.toUpperCase();
    const dice = get().dice.map((d) => ({ ...d, face: f }));
    set({ dice });
  },

  // Refill rerolls + clear convert + reset all skill cooldowns. Lets you
  // chain attacks without waiting between turns.
  devRefillResources: () => {
    const skillSlots = get().skillSlots.map((s) => ({ ...s, cooldownLeft: 0 }));
    set({
      rerollsUsed: 0,
      convertUsed: false,
      skillSlots,
    });
  },

  // Grant a skill by id — adds to skillSlots and auto-places into the
  // inventory grid if there's room (otherwise it goes to the bag).
  // Skipping the cooldown gate by clearing cooldownLeft.
  devGrantSkill: (skillId) => {
    const { skillSlots, inventory } = get();
    if (skillSlots.some((s) => s.skillId === skillId)) return; // already owned
    const newSlots = [
      ...skillSlots,
      { id: `slot_${skillId}_${Date.now()}`, skillId, assignedDice: [], cooldownLeft: 0 },
    ];
    let newPlacements = inventory.placements;
    if (skillId !== "basic_attack") {
      const fit = tryPlaceSkill(skillId, inventory.placements, inventory.width, inventory.height);
      if (fit) {
        newPlacements = [...inventory.placements, { skillId, ...fit }];
      }
      // If no fit, skill goes to the bag (skillSlots present, no placement).
    }
    set({
      skillSlots: newSlots,
      inventory: { ...inventory, placements: newPlacements },
    });
  },

  // Remove all skills except basic_attack (and clear all placements).
  // Useful for testing fresh loadouts without restarting a run.
  devClearSkills: () => {
    const { skillSlots } = get();
    const basic = skillSlots.find((s) => s.skillId === "basic_attack");
    set({
      skillSlots: basic ? [basic] : [],
      inventory: { ...get().inventory, placements: [] },
    });
  },

  // Force the current map node to a different node. Doesn't run encounter
  // logic — just teleports the marker. Useful for jumping to the boss.
  devWarpToNode: (nodeId) => {
    const { run } = get();
    set({ run: { ...run, currentNodeId: nodeId } });
  },

  // Grant N victories (for testing the character unlock progression).
  // Writes directly to localStorage so the value persists across runs.
  devGrantVictories: (n) => {
    try {
      const raw = localStorage.getItem("alphadice.profile.v1");
      const profile = raw ? JSON.parse(raw) : { totalVictories: 0, charactersUsed: {} };
      profile.totalVictories = n;
      localStorage.setItem("alphadice.profile.v1", JSON.stringify(profile));
    } catch {
      // ignore
    }
  },

  // Wipe the persistent profile (resets unlocks).
  devResetProfile: () => {
    try {
      localStorage.removeItem("alphadice.profile.v1");
    } catch {
      // ignore
    }
  },

  // === Restart ===
  restart: () => {
    set({ ...initialState });
  },

  // === Clean old floating texts ===
  pruneFloatingTexts: () => {
    const cutoff = Date.now() - 2000;
    set((s) => {
      const filtered = s.floatingTexts.filter((t) => t.ts > cutoff);
      if (filtered.length === s.floatingTexts.length) return s;
      return { floatingTexts: filtered };
    });
  },
}));

// Convenience selectors
export const selectCharacter = (s) =>
  s.characterId ? CHARACTERS[s.characterId] : null;
