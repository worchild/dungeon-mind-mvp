import { DungeonDirector } from "./dungeonDirector.js";
import { Cartographer } from "./cartographer.js";
import { EncounterMaster } from "./encounterMaster.js";
import { Quartermaster } from "./quartermaster.js";
import { Loremaster } from "./loremaster.js";
import { PuzzleMaster } from "./puzzleMaster.js";
import { NarratorFilter } from "./narratorFilter.js";

export const DungeonCouncil = {
  evaluate(state) {
    const advice = {
      director: DungeonDirector.evaluate(state),
      cartographer: Cartographer.evaluate(state),
      encounter: EncounterMaster.evaluate(state),
      quartermaster: Quartermaster.evaluate(state),
      lore: Loremaster.evaluate(state),
      puzzle: PuzzleMaster.evaluate(state),
    };

    return {
      advice,
      narrationContext: NarratorFilter.buildContext(state, advice),
    };
  },
};
