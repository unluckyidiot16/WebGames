import { useEffect, useState } from "react";
import { useGame } from "./store/gameStore";
import CharacterSelect from "./components/ui/CharacterSelect";
import BattleScreen from "./components/ui/BattleScreen";
import MapScreen from "./components/ui/MapScreen";
import RewardScreen from "./components/ui/RewardScreen";
import EndScreen from "./components/ui/EndScreen";
import { isDevModeEnabled } from "./utils/devMode";
import DevPanel from "./components/dev/DevPanel";

export default function App() {
  const phase = useGame((s) => s.phase);
  const pruneFloatingTexts = useGame((s) => s.pruneFloatingTexts);

  // Dev mode check runs once on mount — URL params won't change mid-session
  // (they get persisted on first detection and read from localStorage after).
  const [devOn] = useState(() => isDevModeEnabled());

  // Prune old floating texts periodically
  useEffect(() => {
    const t = setInterval(pruneFloatingTexts, 1000);
    return () => clearInterval(t);
  }, [pruneFloatingTexts]);

  const screen =
    phase === "select" ? <CharacterSelect /> :
    phase === "map" ? <MapScreen /> :
    phase === "battle" ? <BattleScreen /> :
    phase === "reward" ? <RewardScreen /> :
    (phase === "victory" || phase === "defeat") ? <EndScreen /> :
    null;

  return (
    <>
      {screen}
      {devOn && <DevPanel />}
    </>
  );
}
