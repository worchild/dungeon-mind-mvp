export function ensureDungeonMindState(state) {
  if (!state.dungeonMind) {
    state.dungeonMind = {
      actionQueue: [],
      resolvedActions: [],
      queueCounter: 0,
      eventQueue: [],
      eventHistory: [],
      eventCounter: 0,
      livingDungeon: {
        turn: 0,
        noiseLog: [],
        awareness: {},
        patrols: {},
        patrolHistory: [],
      },
    };
  }

  if (!Array.isArray(state.dungeonMind.actionQueue)) state.dungeonMind.actionQueue = [];
  if (!Array.isArray(state.dungeonMind.resolvedActions)) state.dungeonMind.resolvedActions = [];
  if (typeof state.dungeonMind.queueCounter !== "number") state.dungeonMind.queueCounter = 0;
  if (!Array.isArray(state.dungeonMind.eventQueue)) state.dungeonMind.eventQueue = [];
  if (!Array.isArray(state.dungeonMind.eventHistory)) state.dungeonMind.eventHistory = [];
  if (typeof state.dungeonMind.eventCounter !== "number") state.dungeonMind.eventCounter = 0;
  if (!state.dungeonMind.livingDungeon) {
    state.dungeonMind.livingDungeon = {
      turn: 0,
      noiseLog: [],
      awareness: {},
      patrols: {},
      patrolHistory: [],
    };
  }

  return state.dungeonMind;
}

export function enqueueDirectorActions(state, actions = []) {
  const dungeonMind = ensureDungeonMindState(state);
  const queued = [];

  actions.forEach(action => {
    if (!action?.type || !action?.trigger) return;

    const duplicate = dungeonMind.actionQueue.some(existing =>
      existing.status === "queued" &&
      existing.type === action.type &&
      existing.trigger === action.trigger &&
      existing.source === action.source,
    );

    if (duplicate) return;

    dungeonMind.queueCounter += 1;

    const queuedAction = {
      id: `AQ-${String(dungeonMind.queueCounter).padStart(4, "0")}`,
      type: action.type,
      trigger: action.trigger,
      source: action.source || "dungeonDirector",
      priority: action.priority ?? 5,
      confidence: action.confidence ?? 0.5,
      status: "queued",
      note: action.note || "Queued as future intent only; no automatic state mutation has occurred.",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    dungeonMind.actionQueue.push(queuedAction);
    queued.push(queuedAction);
  });

  return queued;
}

export function processActionQueue(trigger, state) {
  const dungeonMind = ensureDungeonMindState(state);
  const now = new Date().toISOString();
  const resolved = [];

  dungeonMind.actionQueue.forEach(action => {
    if (action.status !== "queued" || action.trigger !== trigger) return;

    action.status = "resolved";
    action.resolvedAt = now;
    action.effect = resolveQueuedAction(action, state);
    resolved.push(action);
  });

  if (resolved.length) {
    dungeonMind.resolvedActions.unshift(...resolved.map(action => ({ ...action })));
    dungeonMind.resolvedActions = dungeonMind.resolvedActions.slice(0, 30);
    state.log.unshift(...resolved.map(action => action.effect.log));
    if (state.log.length > 40) state.log.length = 40;
  }

  return resolved;
}

function resolveQueuedAction(action, state) {
  switch (action.type) {
    case "DARKEN_NARRATION":
      return {
        publicSafe: true,
        log: "The dungeon grows colder. Somewhere nearby, stone shifts in the dark.",
      };
    case "MAINTAIN_TONE":
      return {
        publicSafe: true,
        log: "The dungeon holds its breath, waiting for your next move.",
      };
    case "INCREASE_ENCOUNTER_PRESSURE":
      return {
        publicSafe: true,
        log: "A distant scrape echoes through the passage. The dungeon is paying attention.",
      };
    case "ALLOW_RECOVERY_BEAT":
      return {
        publicSafe: true,
        log: "For a moment, the chamber is still. Even old stones seem to exhale.",
      };
    case "REMIND_AVAILABLE_LOOT":
      return {
        publicSafe: true,
        log: "Something useful catches the edge of your eye among the room's debris.",
      };
    case "NUDGE_TOWARD_CLUES":
      return {
        publicSafe: true,
        log: "A small detail nags at you. This place rewards careful searching.",
      };
    case "SIGNAL_MISSING_CLUES":
      return {
        publicSafe: true,
        log: "The reliquary resists with a soft chime, as if waiting for forgotten words.",
      };
    case "ALLOW_SAFE_FINALE":
      return {
        publicSafe: true,
        log: "The seals seem to recognise the path you have uncovered.",
      };
    case "PREPARE_VICTORY_BEAT":
      return {
        publicSafe: true,
        log: "The dungeon's pressure breaks like a storm passing over a ruined tower.",
      };
    case "MAINTAIN_MAP_CONTINUITY":
    case "MAINTAIN_PUZZLE_PACING":
    case "FILTER_PLAYER_OUTPUT":
    case "MONITOR_NEXT_ACTION":
      return {
        publicSafe: false,
        log: `Queued intent resolved: ${action.type}.`,
      };
    default:
      return {
        publicSafe: false,
        log: `Queued intent resolved: ${action.type}.`,
      };
  }
}
