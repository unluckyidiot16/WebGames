// === Class signature abilities ===
//
// Each class has one signature ability that's distinct from the
// normal skill loadout:
//   • No dice or word required to cast
//   • Fueled by a separate `playerGauge` (0..max), filled by playing
//     words — every letter you spell pushes it up
//   • Once full, the signature card lights up and is one-click cast
//   • After cast, gauge resets to 0 and starts filling again
//
// Design goal: a satisfying "ultimate" moment that rewards stringing
// long words together. Smaller, frequent payoffs go through normal
// skills; signatures are the big-swing power play.
//
// Each entry's `apply(state)` returns a partial state patch that the
// store + sequence layer translates into damage, healing, status, etc.
// Effects are coarse on purpose — the dramatic single button beats
// fiddly conditional combos.

export const SIGNATURES = {
  // --- Knight: defensive ult.
  // The class's identity is steady, durable pressure; the signature
  // doubles down on that by stacking shield + heal in one push.
  knight_bulwark: {
    id: "knight_bulwark",
    name: "철벽 수호",
    description: "방어막 +15, 즉시 12 HP 회복.",
    icon: "/ui/card/shield.png",
    flavor: "방패를 들어올린다. 무엇도 통과시키지 않는다.",
    effect: { kind: "self_shield_heal", shield: 15, heal: 12 },
  },

  // --- Rogue: precision strike.
  // Reflects the "high-T/S/D dice + DASH/STAB/KILL words" pitch —
  // the signature finds the most wounded enemy and finishes the job.
  rogue_assassinate: {
    id: "rogue_assassinate",
    name: "그림자 일격",
    description: "HP가 가장 낮은 적에게 30 데미지 + 1턴 스턴.",
    icon: "/ui/card/dagger.png",
    flavor: "어둠을 가르며 단 한 번의 일격.",
    effect: { kind: "target_lowest_hp", damage: 30, stun: 1 },
  },

  // --- Mage: arcane AOE.
  // Classic ult-feel for the spellcaster — hit everything, leave a
  // damage-over-time burn that ticks for a couple turns.
  mage_meteor: {
    id: "mage_meteor",
    name: "유성 강림",
    description: "모든 적에게 15 데미지 + 3턴 화상.",
    icon: "/ui/card/fire.png",
    flavor: "하늘이 갈라지고 별이 떨어진다.",
    effect: { kind: "all_enemies", damage: 15, burn: { turns: 3, dmg: 3 } },
  },

  // --- Barbarian: berserker AOE.
  // Heavy-hitter that pairs raw damage with self-heal — keeps the
  // class's "absorb damage, return more" feel.
  barbarian_rampage: {
    id: "barbarian_rampage",
    name: "광폭",
    description: "모든 적에게 12 데미지, 자신 10 HP 회복.",
    icon: "/ui/card/fist.png",
    flavor: "분노가 폭발한다. 누구도 막을 수 없다.",
    effect: { kind: "all_enemies_with_heal", damage: 12, heal: 10 },
  },
};

// Mapping from character id → signature id. Single source of truth
// referenced from the store when initializing a run and from the
// signature panel when displaying the card.
export const CHARACTER_SIGNATURES = {
  knight:    "knight_bulwark",
  rogue:     "rogue_assassinate",
  mage:      "mage_meteor",
  barbarian: "barbarian_rampage",
};

export function getSignatureForCharacter(characterId) {
  const sigId = CHARACTER_SIGNATURES[characterId];
  return sigId ? SIGNATURES[sigId] : null;
}
