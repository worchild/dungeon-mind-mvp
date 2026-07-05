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

function advice(status, priority, recommendation, reason) {
  return {
    status,
    priority,
    recommendation,
    reason,
  };
}

function adviseDungeonDirector(actionType, state, errors) {
  if (errors.length) {
    return advice(
      "BLOCKED",
      1,
      "Pause progression until validation errors are resolved.",
      "The validator returned one or more state integrity errors.",
    );
  }

  if (state?.objective?.complete) {
    return advice(
      "COMPLETE",
      2,
      "Prepare end-state, victory narration, and replay notes.",
      "The objective flag is complete.",
    );
  }

  if (state?.threat?.value >= 8) {
    return advice(
      "ESCALATE",
      2,
      "Increase urgency and make future rooms feel more alert.",
      "Threat is at or above the high-alert threshold.",
    );
  }

  return advice(
    "OK",
    3,
    `Action ${actionType} accepted. Maintain pacing and protect objective progression.`,
    "Rules resolved successfully and the objective is still in progress.",
  );
}

function adviseCartographer(actionType, state, room) {
  if (!room) {
    return advice(
      "MISSING_ROOM",
      1,
      "Restore a valid current room before rendering map guidance.",
      "No current room could be found from state.currentRoomId.",
    );
  }

  const visited = state?.player?.visitedRooms?.length || 0;
  const exits = room?.exits?.length || 0;

  return advice(
    "OK",
    3,
    `Current location is ${room.id}. Keep exits player-visible only.`,
    `${visited} room(s) visited. Current room has ${exits} visible exit(s). Last action was ${actionType}.`,
  );
}

function adviseEncounterMaster(actionType, room) {
  if (room?.monster && !room.monster.defeated) {
    return advice(
      "ACTIVE_ENCOUNTER",
      2,
      `Keep ${room.monster.name} present until defeated.`,
      "The current room has an undefeated monster.",
    );
  }

  if (actionType === "DEFEAT_MONSTER") {
    return advice(
      "RESOLVED",
      3,
      "Encounter resolved; combat remains abstract for this MVP.",
      "The latest action was DEFEAT_MONSTER.",
    );
  }

  return advice(
    "OK",
    4,
    "No encounter escalation required.",
    "The current room has no active undefeated monster.",
  );
}

function adviseQuartermaster(actionType, state, room) {
  const inventoryCount = state?.player?.inventory?.length || 0;

  if (actionType === "LOOT") {
    return advice(
      "UPDATED",
      3,
      `Inventory now has ${inventoryCount} item(s).`,
      "The latest action was LOOT.",
    );
  }

  if (room?.loot?.length && !state?.player?.lootedRooms?.includes(room.id)) {
    return advice(
      "AVAILABLE",
      3,
      "Loot is available but not yet collected.",
      "The current room has loot and is not listed in player.lootedRooms.",
    );
  }

  return advice(
    "OK",
    4,
    `Inventory stable at ${inventoryCount} item(s).`,
    "No loot state changed this action.",
  );
}

function adviseStoryteller(actionType, state, room) {
  const threat = state?.threat?.value ?? 0;
  const roomName = room?.name || "unknown room";

  return advice(
    "OK",
    3,
    `Frame the next narrative beat around ${actionType} in ${roomName}.`,
    `Threat is currently ${threat}; narration should match this tension level without revealing hidden state.`,
  );
}

function advisePuzzleMaster(actionType, state, room) {
  const cluesFound = state?.player?.clues?.length || 0;
  const required = state?.objective?.requiredClueIds?.length || 0;

  if (room?.finale) {
    return advice(
      "FINALE_CHECK",
      2,
      `Finale room reached. Check whether clue support is sufficient before safe objective completion.`,
      `Clues found: ${cluesFound}/${required}. Last action was ${actionType}.`,
    );
  }

  return advice(
    "OK",
    3,
    `Clue progress is ${cluesFound}/${required}. Do not reveal hidden solution data.`,
    "Puzzle support should remain implicit until clues are discovered through player action.",
  );
}

function adviseNarratorVisibilityFilter(room) {
  if (!room) {
    return advice(
      "BLOCKED",
      1,
      "Do not narrate until a valid room is available.",
      "No room object was supplied to the visibility filter.",
    );
  }

  return advice(
    "OK",
    1,
    "Player output should use playerVisible fields only.",
    "Hidden state, objective mechanics, clue logic, and Council reasoning must remain behind the screen.",
  );
}
