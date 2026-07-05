export function consultCouncil(action, state, errors = []) {
  const room = state?.rooms?.[state.currentRoomId];
  const actionType = action?.type || "UNKNOWN";

  return {
    action: actionType,
    room: room
      ? {
          id: room.id,
          name: room.name,
        }
      : null,
    council: {
      dungeonDirector: adviseDungeonDirector(actionType, state, errors),
      cartographer: adviseCartographer(actionType, state, room),
      encounterMaster: adviseEncounterMaster(actionType, room),
      quartermaster: adviseQuartermaster(actionType, state, room),
      storyteller: adviseStoryteller(actionType, state, room),
      puzzleMaster: advisePuzzleMaster(actionType, state, room),
      narratorVisibilityFilter: adviseNarratorVisibilityFilter(room),
    },
    validator: {
      ok: errors.length === 0,
      errors,
    },
    generatedAt: new Date().toISOString(),
  };
}

function adviseDungeonDirector(actionType, state, errors) {
  if (errors.length) return "State needs attention before the dungeon can safely continue.";
  if (state?.objective?.complete) return "Objective is complete; prepare end-state and replay notes.";
  if (state?.threat?.value >= 8) return "Threat is high; future rooms should feel more alert and dangerous.";
  return `Action ${actionType} accepted. Maintain pacing and protect objective progression.`;
}

function adviseCartographer(actionType, state, room) {
  if (!room) return "No current room available for map advice.";
  const visited = state?.player?.visitedRooms?.length || 0;
  return `Current location is ${room.id}. ${visited} room(s) visited. Exits remain player-visible only.`;
}

function adviseEncounterMaster(actionType, room) {
  if (room?.monster && !room.monster.defeated) return `${room.monster.name} is active in this room.`;
  if (actionType === "DEFEAT_MONSTER") return "Encounter resolved; combat remains abstract for this MVP.";
  return "No active encounter escalation required.";
}

function adviseQuartermaster(actionType, state, room) {
  const inventoryCount = state?.player?.inventory?.length || 0;
  if (actionType === "LOOT") return `Loot action processed. Inventory now has ${inventoryCount} item(s).`;
  if (room?.loot?.length && !state?.player?.lootedRooms?.includes(room.id)) return "Loot is available but not yet collected.";
  return `Inventory stable at ${inventoryCount} item(s).`;
}

function adviseStoryteller(actionType, state, room) {
  const threat = state?.threat?.value ?? 0;
  const roomName = room?.name || "unknown room";
  return `Narrative beat: ${actionType} in ${roomName}. Threat currently ${threat}.`;
}

function advisePuzzleMaster(actionType, state, room) {
  const cluesFound = state?.player?.clues?.length || 0;
  const required = state?.objective?.requiredClueIds?.length || 0;
  if (room?.finale) return `Finale room reached. Clues found: ${cluesFound}/${required}.`;
  return `Clue progress: ${cluesFound}/${required}. Do not reveal hidden solution data.`;
}

function adviseNarratorVisibilityFilter(room) {
  if (!room) return "No room visible.";
  return "Player output should use playerVisible fields only; hidden state remains behind the screen.";
}
