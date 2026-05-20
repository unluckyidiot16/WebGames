// === Effect Sequencer ===
//
// Pulls all the time-based orchestration out of the zustand store.
// The store owns state; the sequencer owns *when* state changes and
// what side effects fire at each step.
//
// Other systems (sound, camera, hitstop, particles, screen-shake) subscribe
// via registerHook(eventName, fn). Each hook gets a typed payload describing
// what just happened. Subscribers should be fast and side-effect-only.

// --- Hook registry ---

const hooks = {
  onPlayerAttackStart: [],   // { charId, word, damage, tier }
  onPlayerImpact:      [],   // { target, damage, killed }
  onPlayerDodgeMiss:   [],   // { target } — target dodged the attack
  onPlayerVictory:     [],   // { turnNumber, charId }
  onEnemyTurnStart:    [],   // {}
  onEnemyAttackStart:  [],   // { enemy, index, attackType }
  onProjectileSpawn:   [],   // { projectile }
  onProjectileImpact:  [],   // { projectile, damage }
  onPlayerHit:         [],   // { damage, fromEnemy, hpRemaining }
  onPlayerDefeat:      [],   // { turnNumber, charId }
  onTurnEnd:           [],   // { turnNumber }
};

export function registerHook(event, fn) {
  if (!hooks[event]) {
    console.warn(`[sequence] Unknown hook event: ${event}`);
    return () => {};
  }
  hooks[event].push(fn);
  return () => {
    hooks[event] = hooks[event].filter((f) => f !== fn);
  };
}

function fire(event, payload) {
  for (const fn of hooks[event]) {
    try {
      fn(payload);
    } catch (err) {
      console.error(`[sequence] Hook "${event}" failed:`, err);
    }
  }
}

// --- Timing utility ---

export function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// --- Timings (one place to tune feel) ---

const T = {
  attackWindup:   700,  // player anim plays before damage applies (single-hit)
  impactSettle:   400,  // shake duration after hit
  dodgeFlash:     350,  // duration of dodge visual
  postKillPause:  800,  // beat after final enemy dies
  betweenTurns:  1000,  // pause between player attack and enemy turn

  // Rogue dual strike: anim plays once, damage applies at two timestamps.
  dualFirstWindup:  350,  // first stab contact
  dualBetweenHits:  280,  // gap between first and second stab

  // Per-enemy windup/projectile come from data; these are turn-level beats.
  betweenEnemies: 700,
  preDefeat:      800,
  preNextTurn:    400,

  postProjectileImpact: 350,
  preVictory: 800,

  // Melee dash — lunge toward target, then back.
  dashOut:        220,  // lunge forward
  dashBack:       260,  // return to spawn
};

// --- Dash helpers ---
// Compute how far the player should lunge toward an enemy. The player
// spawns at PLAYER_X / PLAYER_Z (mirrored from BattleScene), so dash offset
// is enemy.position - player.position, scaled so we stop ~1.4u short of
// the enemy model (otherwise the player clips into them).
const PLAYER_X = -3.8;
const PLAYER_Z = 1;
const STOP_DISTANCE = 1.4;

function computeDashOffset(enemy) {
  if (!enemy) return { x: 0, z: 0 };
  const dx = (enemy.x ?? 0) - PLAYER_X;
  const dz = (enemy.z ?? 0) - PLAYER_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist <= STOP_DISTANCE) return { x: 0, z: 0 };
  const ratio = (dist - STOP_DISTANCE) / dist;
  return { x: dx * ratio, z: dz * ratio };
}

// Melee classes lunge into striking range; ranged (mage) stays put.
function isMeleeAttacker(charId) {
  return charId !== "mage";
}

// Start a dash. The store holds the dash state; PlayerCharacter useFrame
// interpolates the offset frame-by-frame. We just flip phases at the
// right moments via setTimeout-free async/await flow.
function startDash(set, targetEnemy) {
  const { x, z } = computeDashOffset(targetEnemy);
  if (x === 0 && z === 0) return false;
  set({
    playerDash: {
      targetX: x,
      targetZ: z,
      phase: "out",
      startTime: performance.now(),
      duration: T.dashOut,
    },
  });
  return true;
}

function holdDash(set) {
  set((s) => (s.playerDash
    ? { playerDash: { ...s.playerDash, phase: "hold" } }
    : {}));
}

function returnDash(set) {
  set((s) => (s.playerDash
    ? {
        playerDash: {
          ...s.playerDash,
          phase: "back",
          startTime: performance.now(),
          duration: T.dashBack,
        },
      }
    : {}));
}

function clearDash(set) {
  set({ playerDash: null });
}

// --- Player attack sequence ---

export async function playPlayerAttackSequence({
  get,
  set,
  word,
  // NEW: skill-based path. Old direct-damage callers still work via `dmg`.
  skill,
  assignedDieIndices,
  // Legacy params for backward compat
  dmg,
  targetIdx,
  charId,
  tier,
  dualStrike = false,
}) {
  // Compute damage. If a skill was passed, use its effects definition; else
  // fall back to `dmg`.
  let computedDmg = dmg;
  if (skill && !dmg) {
    computedDmg = computeSkillDamage(skill, word);
  }
  // Check if this skill's effects include dualHit
  const hasDualHit = skill?.effects?.some((e) => e.type === "dualHit") || dualStrike;

  // Phase 1: animation + intent
  set({
    turnState: "attacking",
    lastWordResult: {
      word,
      valid: true,
      damage: computedDmg?.total ?? 0,
      rareLetters: computedDmg?.rareLetters ?? [],
    },
    playerAnim: tier,
    message: skill
      ? `${skill.name}: "${word.toUpperCase()}"!`
      : `"${word.toUpperCase()}" → ${computedDmg?.total ?? 0} 데미지!`,
  });
  fire("onPlayerAttackStart", { charId, word, damage: computedDmg?.total ?? 0, tier, skill });

  // For self-targeted skills (like shield), apply effect and skip combat phase.
  if (skill?.targeting === "self") {
    for (const eff of skill.effects) {
      if (eff.type === "shield") {
        set((s) => ({
          playerShield: (s.playerShield || 0) + eff.amount,
          floatingTexts: [
            ...s.floatingTexts,
            {
              id: `txt_${Date.now()}`,
              text: `+${eff.amount} 방어`,
              color: "#7ad6ff",
              anchor: "player",
              ts: Date.now(),
            },
          ],
        }));
      }
    }
    await delay(T.attackWindup);
    await endAttackOrEnemyTurn(get, set, charId);
    return;
  }

  // === Melee lunge ===
  // Melee classes dash toward the target during windup, hold at the strike
  // moment, then dash back after impact. Ranged classes (mage) skip this
  // entirely — they cast in place.
  const targetEnemyForDash = get().enemies[targetIdx];
  const dashing = isMeleeAttacker(charId) && startDash(set, targetEnemyForDash);

  // Phase 2: dodge check
  // For dashing attackers, the dash-out animation runs in parallel with
  // the attack windup. Once dashOut finishes (~220ms), switch dash to
  // "hold" so the player stays planted during the strike beats.
  if (dashing) {
    // Wait for dash-out to complete, then freeze in place for the rest
    // of the windup.
    const remainingWindup = Math.max(
      0,
      (hasDualHit ? T.dualFirstWindup : T.attackWindup) - T.dashOut,
    );
    await delay(T.dashOut);
    holdDash(set);
    await delay(remainingWindup);
  } else {
    await delay(hasDualHit ? T.dualFirstWindup : T.attackWindup);
  }

  const before = get();
  const targetBefore = before.enemies[targetIdx];
  if (!targetBefore) {
    await endAttackOrEnemyTurn(get, set, charId);
    return;
  }
  const dodgeChance = targetBefore.dodgeChance ?? 0;
  const dodged = Math.random() < dodgeChance;

  if (dodged) {
    set({
      shakingEntity: targetBefore.id,
      floatingTexts: [
        ...before.floatingTexts,
        {
          id: `txt_${Date.now()}`,
          text: "MISS",
          color: "#88e0ff",
          anchor: targetBefore.id,
          ts: Date.now(),
        },
      ],
      message: `${targetBefore.name}이(가) 회피했다!`,
    });
    fire("onPlayerDodgeMiss", { target: targetBefore });
    await delay(T.dodgeFlash);
    set({ shakingEntity: null });
  } else if (hasDualHit) {
    // Two hits on same target (skill-based dualHit) or split-redirect (legacy)
    const totalDmg = computedDmg?.total ?? 0;
    const firstDmg = Math.floor(totalDmg / 2);
    const secondDmg = totalDmg - firstDmg;

    const firstResult = applyPlayerHit(get, set, targetIdx, firstDmg);
    await delay(T.dualBetweenHits);

    let secondTargetIdx = targetIdx;
    // Legacy rogue dualStrike redirects on kill; new rogue_dual_strike skill
    // hits same target twice. Use dualStrike flag (passed by old caller) to
    // decide.
    if (dualStrike && firstResult.killed) {
      const aliveIdx = get().enemies.findIndex((e) => e.alive);
      if (aliveIdx === -1) {
        set({ shakingEntity: null });
        await delay(T.impactSettle);
        await endAttackOrEnemyTurn(get, set, charId);
        return;
      }
      secondTargetIdx = aliveIdx;
      set({ message: `처치! 다음 적에게 2차 베기` });
    }
    applyPlayerHit(get, set, secondTargetIdx, secondDmg);
    await delay(T.impactSettle);
    set({ shakingEntity: null });
  } else {
    // Single-hit attack.
    //
    // For ranged attackers (mage), the animation has played its cast pose
    // during the windup; now we spawn a projectile that arcs from the
    // caster to the target, and only apply damage when it arrives. This
    // gives the spell a visible travel time instead of "instant whack".
    if (!isMeleeAttacker(charId)) {
      const targetEnemy = get().enemies[targetIdx];
      if (targetEnemy?.alive) {
        const projId = `pproj_${Date.now()}`;
        const projectile = {
          id: projId,
          from: "player",
          to: targetEnemy.id,
          // Skill icon hints at element; default to a generic magic bolt.
          // (We could read skill.projectileKind later for per-spell visuals.)
          kind: "magic_bolt",
          startTs: Date.now(),
          duration: 380,
        };
        set((s) => ({ projectiles: [...s.projectiles, projectile] }));
        fire("onProjectileSpawn", { projectile });
        await delay(projectile.duration);
        // Despawn the projectile right before applying the hit so the
        // impact + shake feel synchronized.
        set((s) => ({
          projectiles: s.projectiles.filter((p) => p.id !== projId),
        }));
      }
    }

    applyPlayerHit(get, set, targetIdx, computedDmg?.total ?? 0);

    // Apply non-damage effects (stun, dot, burn) AFTER the hit lands.
    if (skill?.effects) {
      applySkillSideEffects(get, set, skill, targetIdx);
    }

    await delay(T.impactSettle);
    set({ shakingEntity: null });
  }

  // === Dash back ===
  // After the hit resolves, melee attackers retreat to their spawn. We
  // wait for the back-dash to finish before handing off to the enemy
  // turn so the player visibly re-anchors before the next phase starts.
  if (dashing) {
    returnDash(set);
    await delay(T.dashBack);
    clearDash(set);
  }

  await endAttackOrEnemyTurn(get, set, charId);
}

// Compute damage from a skill's effect descriptors.
function computeSkillDamage(skill, word) {
  let total = 0;
  for (const eff of skill.effects || []) {
    if (eff.type !== "damage" && eff.type !== "dualHit") continue;
    if (typeof eff.formula === "number") {
      total += eff.formula;
    } else if (eff.formula === "by_length") {
      // Reuse the table from utils/dice.js (3→6, 4→10, 5→16, 6→25, 7→40)
      const table = { 3: 6, 4: 10, 5: 16, 6: 25, 7: 40 };
      total += table[word.length] ?? 0;
    } else if (typeof eff.formula === "object" && eff.formula !== null) {
      const base = eff.formula.base ?? 0;
      const per = eff.formula.perLetter ?? 0;
      total += base + per * word.length;
    } else if (typeof eff.amount === "number") {
      // Plain fixed-damage effect: { type: "damage", amount: 18 }.
      // Used by pattern-based skills (triple_strike, combo_burn, …) and
      // for flat bonuses on top of by_length (e.g. barbarian_smash).
      total += eff.amount;
    }
  }
  // Rare letter bonus (same as old computeDamage)
  const RARE = { J: 3, Q: 5, X: 5, Z: 4, K: 2, V: 2 };
  const rareLetters = [];
  let bonus = 0;
  for (const ch of word.toUpperCase()) {
    if (RARE[ch]) {
      bonus += RARE[ch];
      rareLetters.push(ch);
    }
  }
  return { base: total, bonus, total: total + bonus, rareLetters };
}

// Apply non-damage effects from a skill to a single target.
function applySkillSideEffects(get, set, skill, targetIdx) {
  const cur = get();
  for (const eff of skill.effects) {
    if (eff.type === "stun") {
      // Stun = bump the target's attack countdown up by N
      const e = cur.enemies[targetIdx];
      if (!e || !e.alive) continue;
      set((s) => ({
        enemies: s.enemies.map((en, i) =>
          i === targetIdx
            ? { ...en, attackCountdownCurrent: en.attackCountdownCurrent + eff.turns }
            : en
        ),
        floatingTexts: [
          ...s.floatingTexts,
          {
            id: `txt_stun_${Date.now()}`,
            text: `스턴 +${eff.turns}`,
            color: "#ffd700",
            anchor: e.id,
            ts: Date.now(),
          },
        ],
      }));
    } else if (eff.type === "dot" || eff.type === "burn") {
      const e = cur.enemies[targetIdx];
      if (!e || !e.alive) continue;
      set((s) => ({
        enemies: s.enemies.map((en, i) =>
          i === targetIdx
            ? {
                ...en,
                statusEffects: [
                  ...en.statusEffects,
                  { kind: eff.type, damage: eff.damage, turnsLeft: eff.turns },
                ],
              }
            : en
        ),
        floatingTexts: [
          ...s.floatingTexts,
          {
            id: `txt_dot_${Date.now()}`,
            text: eff.type === "burn" ? "🔥" : "🐍",
            color: eff.type === "burn" ? "#ff8a3d" : "#8aff5b",
            anchor: e.id,
            ts: Date.now(),
          },
        ],
      }));
    }
  }
}

// Apply a single player→enemy hit: damage, shake, floating text, hook.
function applyPlayerHit(get, set, targetIdx, damage) {
  const cur = get();
  const targetBefore = cur.enemies[targetIdx];
  if (!targetBefore || !targetBefore.alive) {
    return { killed: false };
  }

  const newEnemies = cur.enemies.map((e, i) => {
    if (i !== targetIdx || !e.alive) return e;
    const newHp = Math.max(0, e.hp - damage);
    return { ...e, hp: newHp, alive: newHp > 0 };
  });
  const targetAfter = newEnemies[targetIdx];
  const killed = targetBefore.alive && !targetAfter.alive;

  set({
    enemies: newEnemies,
    shakingEntity: targetBefore.id,
    floatingTexts: [
      ...cur.floatingTexts,
      {
        id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: `-${damage}`,
        color: "#ff3838",
        anchor: targetBefore.id,
        ts: Date.now(),
      },
    ],
  });
  fire("onPlayerImpact", { target: targetBefore, damage, killed });
  return { killed };
}

// Check victory / proceed to enemy turn — shared end-of-attack flow.
async function endAttackOrEnemyTurn(get, set, charId) {
  const allDead = get().enemies.every((e) => !e.alive);
  if (allDead) {
    fire("onPlayerVictory", { turnNumber: get().turnNumber, charId });
    await delay(T.postKillPause);
    set({ playerAnim: "Special" });
    // Hand off to the store, which decides between reward (intermediate
    // node) and victory (boss cleared) based on the current node type.
    get()._enterRewardPhase();
    return;
  }
  // Multi-cast support: instead of auto-handing off to the enemy turn,
  // return control to the player. They can cast another skill with the
  // remaining (un-used) dice, or click the explicit "턴 종료" button to
  // commit. This is what makes a single turn feel like a proper "round"
  // rather than a single action.
  set({ turnState: "player_turn", playerAnim: "idle", playerDash: null });
}

// --- Enemy turn sequence ---
//
// Each enemy ticks down their attackCountdown. Any enemy hitting 0 attacks
// the player (melee/ranged flow), then their countdown resets to max.
// Status effects (DoT, burn) tick once at start of enemy turn.

export async function playEnemyTurnSequence({ get, set }) {
  set({
    turnState: "enemy_turn",
    playerAnim: "idle",
    message: "적의 차례...",
  });
  fire("onEnemyTurnStart", {});

  // === Phase 0: Tick status effects (DoT, burn) on enemies ===
  {
    const cur = get();
    const newFt = [...cur.floatingTexts];
    const newEnemies = cur.enemies.map((e) => {
      if (!e.alive || !e.statusEffects?.length) return e;
      let hp = e.hp;
      let totalTick = 0;
      const newEffects = [];
      for (const eff of e.statusEffects) {
        if (eff.turnsLeft <= 0) continue;
        totalTick += eff.damage;
        if (eff.turnsLeft - 1 > 0) {
          newEffects.push({ ...eff, turnsLeft: eff.turnsLeft - 1 });
        }
      }
      hp = Math.max(0, hp - totalTick);
      if (totalTick > 0) {
        newFt.push({
          id: `txt_tick_${Date.now()}_${e.id}`,
          text: `-${totalTick}`,
          color: "#ff8a3d",
          anchor: e.id,
          ts: Date.now(),
        });
      }
      return {
        ...e,
        hp,
        alive: hp > 0 && e.alive,
        statusEffects: newEffects,
      };
    });
    set({ enemies: newEnemies, floatingTexts: newFt });

    if (newEnemies.some((e, i) => e.hp < cur.enemies[i].hp)) {
      await delay(500);
    }

    if (newEnemies.every((e) => !e.alive)) {
      fire("onPlayerVictory", { turnNumber: cur.turnNumber });
      await delay(T.preVictory);
      get()._enterRewardPhase();
      return;
    }
  }

  // === Phase 1: Tick countdowns, then attack if 0 ===
  {
    const cur = get();
    const newEnemies = cur.enemies.map((e) => {
      if (!e.alive) return e;
      return {
        ...e,
        attackCountdownCurrent: Math.max(0, e.attackCountdownCurrent - 1),
      };
    });
    set({ enemies: newEnemies });
  }

  // Brief beat so countdown numbers visibly drop before attacks fire.
  await delay(300);

  // === Phase 2: Attacks from enemies whose countdown hit 0 ===
  const attackingList = get().enemies
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.alive && e.attackCountdownCurrent <= 0);

  for (const { e, i } of attackingList) {
    set({ enemyAttackingIndex: i });
    fire("onEnemyAttackStart", { enemy: e, index: i, attackType: e.attackType });

    const windup = e.windupMs ?? 500;

    if (e.attackType === "ranged") {
      await delay(windup);

      const projId = `proj_${Date.now()}_${i}`;
      const projectile = {
        id: projId,
        from: e.id,
        to: "player",
        kind: e.projectileKind || "magic_bolt",
        startTs: Date.now(),
        duration: e.projectileMs ?? 450,
      };
      set((s) => ({ projectiles: [...s.projectiles, projectile] }));
      fire("onProjectileSpawn", { projectile });

      await delay(projectile.duration);

      const damageHit = applyEnemyDamage(get, set, e, i);
      fire("onProjectileImpact", { projectile, damage: e.damage });
      set((s) => ({ projectiles: s.projectiles.filter((p) => p.id !== projId) }));

      if (damageHit.defeated) {
        fire("onPlayerDefeat", { turnNumber: damageHit.turnNumber, charId: damageHit.charId });
        await delay(T.preDefeat);
        set({ phase: "defeat" });
        return;
      }

      await delay(T.postProjectileImpact);
      set({ shakingEntity: null, playerAnim: "idle", enemyAttackingIndex: null, playerDash: null });
    } else {
      // Melee
      await delay(windup);
      const damageHit = applyEnemyDamage(get, set, e, i);

      if (damageHit.defeated) {
        fire("onPlayerDefeat", { turnNumber: damageHit.turnNumber, charId: damageHit.charId });
        await delay(T.preDefeat);
        set({ phase: "defeat" });
        return;
      }

      await delay(T.impactSettle);
      set({ shakingEntity: null, playerAnim: "idle", enemyAttackingIndex: null, playerDash: null });
    }

    // After attacking, reset this enemy's countdown to its max.
    set((s) => ({
      enemies: s.enemies.map((en, ei) =>
        ei === i
          ? { ...en, attackCountdownCurrent: en.attackCountdownMax }
          : en
      ),
    }));

    await delay(T.betweenEnemies);
  }

  await delay(T.preNextTurn);
  fire("onTurnEnd", { turnNumber: get().turnNumber });
  get()._advanceTurn();
}

// Helper: apply enemy damage + emit hit visuals/state.
function applyEnemyDamage(get, set, enemy, enemyIdx) {
  const cur = get();

  // Shield absorbs first
  let remaining = enemy.damage;
  let newShield = cur.playerShield || 0;
  const absorbed = Math.min(newShield, remaining);
  newShield -= absorbed;
  remaining -= absorbed;

  const newHP = Math.max(0, cur.playerHP - remaining);
  set({
    playerHP: newHP,
    playerShield: newShield,
    shakingEntity: "player",
    playerAnim: "hit",
    floatingTexts: [
      ...cur.floatingTexts,
      {
        id: `txt_${Date.now()}_${enemyIdx}`,
        text: absorbed > 0
          ? (remaining > 0 ? `-${remaining} (${absorbed} 막음)` : `${absorbed} 막음`)
          : `-${enemy.damage}`,
        color: absorbed > 0 ? "#7ad6ff" : "#ff3838",
        anchor: "player",
        ts: Date.now(),
      },
    ],
  });
  fire("onPlayerHit", {
    damage: remaining,
    absorbed,
    fromEnemy: enemy,
    hpRemaining: newHP,
  });
  return {
    defeated: newHP <= 0,
    turnNumber: cur.turnNumber,
    charId: cur.characterId,
  };
}

// === Signature ability sequence ===
//
// Class ult triggered from the SignatureCard. Effect shapes match the
// `effect.kind` field in src/data/signatures.js:
//
//   self_shield_heal      — knight: +shield, +heal on self
//   target_lowest_hp      — rogue:  big single-target damage + stun
//   all_enemies           — mage:   AOE damage + burn DoT
//   all_enemies_with_heal — barbarian: AOE damage + self heal
//
// All paths share the same shape: brief animation hand-off → effect
// resolution → text feedback → end-of-attack handoff (which checks for
// victory or returns control to the player for multi-cast turns).
export async function playSignatureSequence({ get, set, signature }) {
  const charId = get().characterId;
  const eff = signature.effect;
  const SHAKE_MS = 300;

  // Big animation moment regardless of effect — Special attack pose,
  // ground shake, dramatic floating text with the signature name.
  set({
    playerAnim: "Special",
    shakingEntity: "ALL",
    floatingTexts: [
      ...get().floatingTexts,
      {
        id: `sig_${Date.now()}`,
        text: signature.name,
        color: "#fce6ad",
        anchor: "player",
        ts: Date.now(),
      },
    ],
  });
  await delay(SHAKE_MS);
  set({ shakingEntity: null });

  // --- Effect resolution ---
  if (eff.kind === "self_shield_heal") {
    // Knight: stack shield + immediate heal. Heal clamps at maxHP.
    const cur = get();
    const newHP = Math.min(cur.playerMaxHP, cur.playerHP + (eff.heal || 0));
    set({
      playerHP: newHP,
      playerShield: (cur.playerShield || 0) + (eff.shield || 0),
      floatingTexts: [
        ...cur.floatingTexts,
        {
          id: `sigheal_${Date.now()}`,
          text: `+${eff.heal} HP`,
          color: "#52b788",
          anchor: "player",
          ts: Date.now(),
        },
        {
          id: `sigshield_${Date.now() + 1}`,
          text: `🛡 +${eff.shield}`,
          color: "#9bc6ff",
          anchor: "player",
          ts: Date.now() + 1,
        },
      ],
    });
  } else if (eff.kind === "target_lowest_hp") {
    // Rogue: find weakest living enemy and obliterate it.
    const cur = get();
    let bestIdx = -1;
    let bestHp = Infinity;
    cur.enemies.forEach((e, i) => {
      if (e.alive && e.hp < bestHp) {
        bestHp = e.hp;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) {
      applyPlayerHit(get, set, bestIdx, eff.damage);
      // Stun if target survives.
      const survivor = get().enemies[bestIdx];
      if (survivor?.alive && eff.stun) {
        set((s) => ({
          enemies: s.enemies.map((en, i) =>
            i === bestIdx
              ? { ...en, stunnedTurns: (en.stunnedTurns || 0) + eff.stun }
              : en
          ),
        }));
      }
    }
  } else if (eff.kind === "all_enemies" || eff.kind === "all_enemies_with_heal") {
    // Mage + Barbarian: AOE damage. Mage layers burn DoT, Barbarian
    // layers self-heal.
    const cur = get();
    cur.enemies.forEach((e, i) => {
      if (!e.alive) return;
      applyPlayerHit(get, set, i, eff.damage);
    });
    if (eff.burn) {
      // Add burn DoT to all living enemies (after damage resolution).
      set((s) => ({
        enemies: s.enemies.map((en) =>
          en.alive
            ? {
                ...en,
                statusEffects: [
                  ...en.statusEffects,
                  { kind: "burn", damage: eff.burn.dmg, turnsLeft: eff.burn.turns },
                ],
              }
            : en
        ),
      }));
    }
    if (eff.kind === "all_enemies_with_heal" && eff.heal) {
      const after = get();
      const healed = Math.min(after.playerMaxHP, after.playerHP + eff.heal);
      set({
        playerHP: healed,
        floatingTexts: [
          ...get().floatingTexts,
          {
            id: `sigheal_${Date.now()}`,
            text: `+${eff.heal} HP`,
            color: "#52b788",
            anchor: "player",
            ts: Date.now(),
          },
        ],
      });
    }
  }

  // Settle, then re-use the same post-attack handoff as castSkill — this
  // checks for victory and either enters reward phase or returns control
  // to the player for further multi-cast actions.
  await delay(T.postKillPause);
  set({ playerAnim: "idle" });
  await endAttackOrEnemyTurn(get, set, charId);
}
