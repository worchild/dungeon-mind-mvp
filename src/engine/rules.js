import { getState, setState, saveState, loadSavedState, loadDungeonContent } from "../state/store.js";
import { validateState } from "../validation/validator.js";
import { consultCouncil } from "./council.js?v=0.7.1";
import { ensureDungeonMindState, enqueueDirectorActions, processActionQueue } from "./actionQueue.js?v=0.7.1";

let initialContent = null;

export async function initialiseGame() {
  initialContent = await fetch("./data/dungeon.json?v=0.7.1").then(r => r.json());
  await loadDungeonContent("./data/dungeon.json?v=0.7.1");
  ensureDungeonMindState(getState());
  return getState();
}

export function currentRoom() {
  const state = getState();
  return state.rooms[state.currentRoomId];
}

function addLog(text) {
  const state = getState();
  state.log.unshift(text);
  if (state.log.length > 40) state.log.pop();
}

function addThreat(amount, reason) {
  const state = getState();
  if (!amount) return;
  state.threat.value = Math.min(state.threat.max, Math.max(0, state.threat.value + amount));
  state.threat.events.push({ roomId: state.currentRoomId, amount, reason, at: new Date().toISOString() });
  addLog(`Threat +${amount}: ${reason}`);
}

function checkObjective(byLoot = false) {
  const state = getState();
  const hasKey = state.player.inventory.some(item => item.id === "L05");
  const hasCoreClues = state.objective.requiredClueIds.every(id => state.player.clues.includes(id));

  if (hasKey && hasCoreClues && !state.objective.complete) {
    state.objective.complete = true;
    addLog("Objective complete: the Dawn Key is recovered with the correct seal knowledge.");
  } else if (hasKey && !hasCoreClues && !state.objective.complete) {
    state.objective.complete = true;
    addThreat(2, "forced the reliquary without all key clues");
    addLog("Objective complete, but the reliquary cracked loudly. Subtle? No. Effective? Yes.");
  } else if (!byLoot && state.currentRoomId === "R10") {
    addLog(hasCoreClues ? "The reliquary bands tremble. The Dawn Key can be taken safely." : "The reliquary resists. More clues would make this safer.");
  }
}

function processRelevantQueueTriggers(action, state) {
  const resolved = [];

  resolved.push(...processActionQueue("NEXT_PLAYER_ACTION", state));

  if (action.type === "MOVE") {
    resolved.push(...processActionQueue("NEXT_ROOM_ENTER", state));
  }

  if (action.type === "SEARCH") {
    resolved.push(...processActionQueue("NEXT_SEARCH_OPPORTUNITY", state));
  }

  if (["SEARCH", "LOOT", "DEFEAT_MONSTER"].includes(action.type)) {
    resolved.push(...processActionQueue("NEXT_NARRATION", state));
  }

  const room = state.rooms[state.currentRoomId];
  const safeRoomAction = !room?.monster || room.monster.defeated;
  if (safeRoomAction && ["SEARCH", "LOOT"].includes(action.type)) {
    resolved.push(...processActionQueue("NEXT_SAFE_ROOM_ACTION", state));
  }

  if (state.currentRoomId === "R10") {
    resolved.push(...processActionQueue("NEXT_FINALE_ACTION", state));
  }

  return resolved;
}

export function dispatch(action) {
  const state = getState();
  if (!state) return { ok: false, errors: ["Game has not initialised."], councilResult: null };

  ensureDungeonMindState(state);

  switch (action.type) {
    case "MOVE": {
      const next = state.rooms[action.roomId];
      if (!next) addLog("That exit leads nowhere. Validator should have caught this goblin business.");
      else {
        state.currentRoomId = action.roomId;
        if (!state.player.visitedRooms.includes(action.roomId)) {
          state.player.visitedRooms.push(action.roomId);
          addThreat(next.threatOnEnter || 0, `entered ${next.name}`);
        }
        next.visited = true;
        if (action.roomId === "R10") checkObjective(false);
      }
      break;
    }
    case "SEARCH": {
      const room = currentRoom();
      if (!room.search || room.search.done) break;
      room.search.done = true;
      if (!state.player.searchedRooms.includes(room.id)) state.player.searchedRooms.push(room.id);
      if (room.search.clueId && !state.player.clues.includes(room.search.clueId)) state.player.clues.push(room.search.clueId);
      addLog(room.search.text);
      addThreat(room.threatOnSearch || 0, `searched ${room.name}`);
      break;
    }
    case "LOOT": {
      const room = currentRoom();
      if (!room.loot?.length || state.player.lootedRooms.includes(room.id)) break;
      room.loot.forEach(item => {
        if (!state.player.inventory.some(i => i.id === item.id)) state.player.inventory.push(item);
        addLog(`Loot gained: ${item.name}. ${item.text}`);
      });
      state.player.lootedRooms.push(room.id);
      addThreat(room.threatOnLoot || 0, `took loot in ${room.name}`);
      if (room.id === "R10") checkObjective(true);
      break;
    }
    case "DEFEAT_MONSTER": {
      const room = currentRoom();
      if (!room.monster || room.monster.defeated) break;
      room.monster.defeated = true;
      if (!state.player.defeatedMonsters.includes(room.monster.id)) state.player.defeatedMonsters.push(room.monster.id);
      addLog(`${room.monster.name} defeated. The button-based combat system remains undefeated.`);
      break;
    }
    case "SAVE": saveState(); addLog("Game saved locally."); break;
    case "LOAD": {
      try {
        const loaded = loadSavedState();
        if (loaded) ensureDungeonMindState(loaded);
        addLog(loaded ? "Game loaded from local save." : "No local save found.");
      } catch { addLog("Save file could not be loaded."); }
      break;
    }
    case "IMPORT_STATE": {
      const errors = validateState(action.state);
      if (errors.length) addLog("Import rejected: " + errors.join(" "));
      else {
        ensureDungeonMindState(action.state);
        setState(action.state);
        addLog("Imported save loaded.");
      }
      break;
    }
    case "RESET": {
      setState(structuredClone(initialContent.initialState));
      ensureDungeonMindState(getState());
      break;
    }
    default: addLog(`Unknown action: ${action.type}`);
  }

  const finalState = getState();
  ensureDungeonMindState(finalState);
  const resolvedActions = processRelevantQueueTriggers(action, finalState);
  const errors = validateState(finalState);
  const councilResult = consultCouncil(action, finalState, errors);
  const enqueuedActions = enqueueDirectorActions(finalState, councilResult.actionQueue);

  councilResult.resolvedActions = resolvedActions;
  councilResult.enqueuedActions = enqueuedActions;
  councilResult.persistedActionQueue = finalState.dungeonMind.actionQueue;
  councilResult.resolvedActionHistory = finalState.dungeonMind.resolvedActions;

  console.log("Dungeon Mind Internal Reasoning", councilResult);

  return { ok: errors.length === 0, errors, state: finalState, councilResult };
}
