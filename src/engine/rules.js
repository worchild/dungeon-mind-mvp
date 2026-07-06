import { getState, setState, saveState, loadSavedState, loadDungeonContent, getClueBook } from "../state/store.js";
import { validateState } from "../validation/validator.js";
import { consultCouncil } from "./council.js?v=0.9.0";
import { ensureDungeonMindState, enqueueDirectorActions, processActionQueue } from "./actionQueue.js?v=0.9.0";
import { ensureEventState, eventTriggersForAction, processEventQueue, scheduleDirectorEvents } from "./eventQueue.js?v=0.9.0";

let initialContent = null;

const ITEM_ACTIONS = {
  L01: {
    inspect: "The Star-Bronze Buckle is decorative but old. Its seven-pointed star matches the fort motif, though no seal answers it yet.",
    use: ({ room }) => room.id === "R02"
      ? "You hold the buckle near the listening shields. The statues ignore it. Apparently fashion is not the first seal."
      : "The buckle catches a little dungeon-light, but nothing nearby responds.",
  },
  L02: {
    inspect: "The Moon-Rusted Guard Token is cold, stamped with a watch mark and worn smooth by nervous fingers.",
    use: ({ room }) => room.id === "R03"
      ? "You lower the guard token toward the moonwater. The ripples briefly part around the safe stones, then close again."
      : "The guard token chills your palm, but this does not seem to be its post.",
  },
  L03: {
    inspect: "The Keeper's Silver Pin is shaped like a closed eye. Its back is clean, as if it was meant to be worn, not buried in tribute.",
    use: ({ room, state }) => {
      if (room.id === "R10") {
        addItemInsight(state, "ITEM-EYE-PIN", "Item insight: the Keeper's Silver Pin answers the open-eye part of the ritual. It belongs near the reliquary, not in the tribute font.");
        return "You hold the silver pin before the reliquary. The blind sun warms, acknowledging the sign of the eye.";
      }
      if (room.id === "R05") return "The pin feels deliberately separate from the coin stacks. It was entrusted, not offered.";
      return "The closed-eye pin feels important, but the room gives it no answer.";
    },
  },
  L04: {
    inspect: "The Dawn-Thread Cord is warm and catches light that is not currently present, which is rude but useful.",
    use: ({ room, state }) => {
      if (room.id === "R08") {
        addItemInsight(state, "ITEM-DAWN-THREAD", "Item insight: the Dawn-Thread Cord fits the mirror's third sign. The clue trail is becoming physical.");
        return "You hang the Dawn-Thread Cord on the sun-thread hook. The black mirror brightens for one breath.";
      }
      if (room.id === "R10") {
        addItemInsight(state, "ITEM-DAWN-THREAD-RELIQUARY", "Item insight: the Dawn-Thread Cord supports the final dawn-thread sign at the reliquary.");
        return "You lay the cord near the bronze bands. The final band shivers toward sunrise.";
      }
      return "The cord glows faintly, but this is not the right place for the dawn-thread sign.";
    },
  },
  L05: {
    inspect: "The Dawn Key contains sunrise trapped in amber. It hums like a door remembering how to open.",
    use: ({ state }) => {
      if (!state.objective.complete) checkObjective(true);
      return state.objective.complete
        ? "You raise the Dawn Key. Somewhere above, a sealed way remembers the morning. Victory is now very plausible."
        : "The Dawn Key flares, but the dungeon has not fully accepted how you recovered it.";
    },
  },
};

export async function initialiseGame() {
  initialContent = await fetch("./data/dungeon.json?v=0.9.0").then(r => r.json());
  await loadDungeonContent("./data/dungeon.json?v=0.9.0");
  ensureDungeonMindState(getState());
  ensureEventState(getState());
  ensureExploreState(getState());
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

function ensureExploreState(state) {
  if (!state.player) state.player = {};
  if (!Array.isArray(state.player.insights)) state.player.insights = [];
  if (!Array.isArray(state.player.inspectedFeatures)) state.player.inspectedFeatures = [];
  if (!Array.isArray(state.player.inspectedItems)) state.player.inspectedItems = [];
  if (!Array.isArray(state.player.usedItems)) state.player.usedItems = [];
}

function addItemInsight(state, id, text) {
  ensureExploreState(state);
  if (state.player.insights.some(insight => insight.id === id)) return false;
  state.player.insights.unshift({ id, text, at: new Date().toISOString(), source: "inventory" });
  state.player.insights = state.player.insights.slice(0, 12);
  addLog(text);
  return true;
}

function clueDetails(clueId) {
  const clue = getClueBook()[clueId];
  if (!clue) return { id: clueId, title: clueId, text: clueId, tags: [], pointsTo: [], importance: "unknown" };
  if (typeof clue === "string") return { id: clueId, title: clueId, text: clue, tags: [], pointsTo: [], importance: "lead" };
  return {
    id: clueId,
    title: clue.title || clueId,
    text: clue.text || clueId,
    importance: clue.importance || "lead",
    foundIn: clue.foundIn,
    pointsTo: clue.pointsTo || [],
    tags: clue.tags || [],
    hint: clue.hint || "",
  };
}

function addClue(clueId) {
  const state = getState();
  if (!clueId || state.player.clues.includes(clueId)) return false;
  state.player.clues.push(clueId);
  addInsightForClue(clueId);
  return true;
}

function addInsightForClue(clueId) {
  const state = getState();
  ensureExploreState(state);

  const newClue = clueDetails(clueId);
  const previousClues = state.player.clues.filter(id => id !== clueId).map(clueDetails);
  const sharedTags = [...new Set(previousClues.flatMap(clue =>
    (clue.tags || []).filter(tag => (newClue.tags || []).includes(tag)),
  ))];

  const requiredFound = state.objective.requiredClueIds.filter(id => state.player.clues.includes(id)).length;
  const requiredTotal = state.objective.requiredClueIds.length;

  const insightRules = [
    {
      id: "I-RITUAL-THREAD",
      when: () => sharedTags.some(tag => ["hands", "eye", "dawn", "thread", "seal"].includes(tag)) && state.player.clues.includes("C08"),
      text: "Insight: the repeated signs are forming an order — empty hand, open eye, dawn thread. The reliquary is less a lock and more a ritual.",
    },
    {
      id: "I-RESTRAINT-TREASURE",
      when: () => state.player.clues.includes("C02") && state.player.clues.includes("C05"),
      text: "Insight: two clues now point to restraint. The treasure hunt is not asking you to grab everything; it is asking you to choose what was entrusted.",
    },
    {
      id: "I-DAWN-EYE",
      when: () => state.player.clues.includes("C01") && state.player.clues.includes("C06"),
      text: "Insight: the open eye and the blind sun belong together. The trail seems to bend toward the mirror and the reliquary.",
    },
    {
      id: "I-FINALE-READY",
      when: () => requiredFound === requiredTotal,
      text: "Insight: you have the three core signs. The path to the Dawn Key should now be readable rather than forced.",
    },
  ];

  insightRules.forEach(rule => {
    if (!rule.when()) return;
    if (state.player.insights.some(insight => insight.id === rule.id)) return;
    const insight = { id: rule.id, text: rule.text, clueId, at: new Date().toISOString() };
    state.player.insights.unshift(insight);
    state.player.insights = state.player.insights.slice(0, 12);
    addLog(rule.text);
  });
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

function inspectFeature(action) {
  const state = getState();
  const room = currentRoom();
  const feature = room.inspectables?.find(item => item.id === action.featureId);

  if (!feature) {
    addLog("You study the room, but nothing answers your attention. Rude architecture.");
    return;
  }

  const inspectionId = `${room.id}:${feature.id}`;
  if (state.player.inspectedFeatures.includes(inspectionId)) {
    addLog(feature.repeatText || `You have already inspected ${feature.label}.`);
    return;
  }

  state.player.inspectedFeatures.push(inspectionId);
  feature.done = true;
  addLog(feature.text);

  if (feature.clueId && addClue(feature.clueId)) {
    addLog(`Clue discovered: ${clueDetails(feature.clueId).title}.`);
  }

  addThreat(feature.threat || 0, `inspected ${feature.label} in ${room.name}`);
}

function inventoryItem(itemId) {
  const state = getState();
  return state.player.inventory.find(item => item.id === itemId);
}

function inspectItem(action) {
  const state = getState();
  const item = inventoryItem(action.itemId);
  if (!item) {
    addLog("You rummage for that item, but your pack refuses to produce it.");
    return;
  }

  const text = ITEM_ACTIONS[item.id]?.inspect || `${item.name}: ${item.text}`;
  const firstInspection = !state.player.inspectedItems.includes(item.id);
  if (firstInspection) state.player.inspectedItems.push(item.id);
  addLog(firstInspection ? text : `You inspect ${item.name} again. ${text}`);
}

function useItem(action) {
  const state = getState();
  const room = currentRoom();
  const item = inventoryItem(action.itemId);
  if (!item) {
    addLog("You cannot use an item you do not have. Very unfair, but traditional.");
    return;
  }

  const handler = ITEM_ACTIONS[item.id]?.use;
  const result = typeof handler === "function"
    ? handler({ state, room, item })
    : "You try using the item, but the dungeon offers no meaningful response.";

  addLog(result);

  const useId = `${item.id}:${room.id}`;
  if (!state.player.usedItems.includes(useId)) state.player.usedItems.push(useId);
}

function processRelevantQueueTriggers(action, state) {
  const resolved = [];
  resolved.push(...processActionQueue("NEXT_PLAYER_ACTION", state));
  if (action.type === "MOVE") resolved.push(...processActionQueue("NEXT_ROOM_ENTER", state));
  if (["SEARCH", "INSPECT_FEATURE", "INSPECT_ITEM"].includes(action.type)) resolved.push(...processActionQueue("NEXT_SEARCH_OPPORTUNITY", state));
  if (["SEARCH", "INSPECT_FEATURE", "INSPECT_ITEM", "USE_ITEM", "LOOT", "DEFEAT_MONSTER"].includes(action.type)) resolved.push(...processActionQueue("NEXT_NARRATION", state));
  const room = state.rooms[state.currentRoomId];
  const safeRoomAction = !room?.monster || room.monster.defeated;
  if (safeRoomAction && ["SEARCH", "INSPECT_FEATURE", "INSPECT_ITEM", "USE_ITEM", "LOOT"].includes(action.type)) resolved.push(...processActionQueue("NEXT_SAFE_ROOM_ACTION", state));
  if (state.currentRoomId === "R10") resolved.push(...processActionQueue("NEXT_FINALE_ACTION", state));
  return resolved;
}

export function dispatch(action) {
  const state = getState();
  if (!state) return { ok: false, errors: ["Game has not initialised."], councilResult: null };

  ensureDungeonMindState(state);
  ensureEventState(state);
  ensureExploreState(state);

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
    case "INSPECT_FEATURE": inspectFeature(action); break;
    case "INSPECT_ITEM": inspectItem(action); break;
    case "USE_ITEM": useItem(action); break;
    case "SEARCH": {
      const room = currentRoom();
      if (!room.search || room.search.done) break;
      room.search.done = true;
      if (!state.player.searchedRooms.includes(room.id)) state.player.searchedRooms.push(room.id);
      if (room.search.clueId) addClue(room.search.clueId);
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
        if (loaded) {
          ensureDungeonMindState(loaded);
          ensureEventState(loaded);
          ensureExploreState(loaded);
        }
        addLog(loaded ? "Game loaded from local save." : "No local save found.");
      } catch { addLog("Save file could not be loaded."); }
      break;
    }
    case "IMPORT_STATE": {
      const errors = validateState(action.state);
      if (errors.length) addLog("Import rejected: " + errors.join(" "));
      else {
        ensureDungeonMindState(action.state);
        ensureEventState(action.state);
        ensureExploreState(action.state);
        setState(action.state);
        addLog("Imported save loaded.");
      }
      break;
    }
    case "RESET": {
      setState(structuredClone(initialContent.initialState));
      ensureDungeonMindState(getState());
      ensureEventState(getState());
      ensureExploreState(getState());
      break;
    }
    default: addLog(`Unknown action: ${action.type}`);
  }

  const finalState = getState();
  ensureDungeonMindState(finalState);
  ensureEventState(finalState);
  ensureExploreState(finalState);

  const resolvedActions = processRelevantQueueTriggers(action, finalState);
  const eventTriggers = eventTriggersForAction(action, finalState);
  const resolvedEvents = processEventQueue(eventTriggers, finalState);
  const errors = validateState(finalState);
  const councilResult = consultCouncil(action, finalState, errors);
  const enqueuedActions = enqueueDirectorActions(finalState, councilResult.actionQueue);
  const enqueuedEvents = scheduleDirectorEvents(action, finalState);

  councilResult.resolvedActions = resolvedActions;
  councilResult.enqueuedActions = enqueuedActions;
  councilResult.persistedActionQueue = finalState.dungeonMind.actionQueue;
  councilResult.resolvedActionHistory = finalState.dungeonMind.resolvedActions;
  councilResult.eventTriggers = eventTriggers;
  councilResult.resolvedEvents = resolvedEvents;
  councilResult.enqueuedEvents = enqueuedEvents;
  councilResult.persistedEventQueue = finalState.dungeonMind.eventQueue;
  councilResult.eventHistory = finalState.dungeonMind.eventHistory;

  console.log("Dungeon Mind Internal Reasoning", councilResult);

  return { ok: errors.length === 0, errors, state: finalState, councilResult };
}
