const EVENT_MESSAGES = {
  DISTANT_FOOTSTEPS: "You hear distant footsteps somewhere beyond the walls. They stop when you stop.",
  COLD_DRAFT: "A cold draft slips through the chamber, carrying the smell of wet stone and old metal.",
  FALLING_DUST: "Dust falls from the ceiling in a thin grey veil, though nothing above you moves.",
  DOOR_CREAK: "Somewhere nearby, an old door creaks open and then quietly closes again.",
};

export function ensureEventState(state) {
  if (!state.dungeonMind) state.dungeonMind = {};
  if (!Array.isArray(state.dungeonMind.eventQueue)) state.dungeonMind.eventQueue = [];
  if (!Array.isArray(state.dungeonMind.eventHistory)) state.dungeonMind.eventHistory = [];
  if (typeof state.dungeonMind.eventCounter !== "number") state.dungeonMind.eventCounter = 0;
  return state.dungeonMind;
}

export function scheduleDirectorEvents(action, state) {
  const dungeonMind = ensureEventState(state);
  const events = [];

  if (["SEARCH", "INSPECT_FEATURE"].includes(action.type)) {
    events.push({
      type: "ATMOSPHERE",
      trigger: "NEXT_ROOM_ENTER",
      priority: 2,
      payload: { kind: "DISTANT_FOOTSTEPS" },
      source: "Dungeon Director",
      note: "Scheduled after close investigation to make the dungeon feel alert.",
    });
  }

  if (state.threat?.value >= 5 && ["LOOT", "USE_ITEM", "INSPECT_ITEM"].includes(action.type)) {
    events.push({
      type: "TENSION",
      trigger: "NEXT_SAFE_ACTION",
      priority: 3,
      payload: { kind: "DOOR_CREAK" },
      source: "Dungeon Director",
      note: "Scheduled because threat is high and the dungeon should start reacting audibly.",
    });
  }

  if (action.type === "MOVE" && state.threat?.value >= 3) {
    events.push({
      type: "ATMOSPHERE",
      trigger: "NEXT_PLAYER_ACTION",
      priority: 1,
      payload: { kind: "COLD_DRAFT" },
      source: "Dungeon Director",
      note: "Scheduled as low-pressure atmosphere while the player moves through an awakening dungeon.",
    });
  }

  return enqueueEvents(state, events, dungeonMind);
}

export function enqueueEvents(state, events = [], dungeonMind = ensureEventState(state)) {
  const queued = [];

  events.forEach(event => {
    if (!event?.trigger || !event?.payload?.kind) return;

    const duplicateQueued = dungeonMind.eventQueue.some(existing =>
      existing.status === "queued" &&
      existing.trigger === event.trigger &&
      existing.payload?.kind === event.payload.kind,
    );

    const recentlyResolved = dungeonMind.eventHistory.some(existing =>
      existing.payload?.kind === event.payload.kind &&
      existing.trigger === event.trigger,
    );

    if (duplicateQueued || recentlyResolved) return;

    dungeonMind.eventCounter += 1;
    const queuedEvent = {
      id: `EV-${String(dungeonMind.eventCounter).padStart(4, "0")}`,
      type: event.type || "ATMOSPHERE",
      trigger: event.trigger,
      priority: event.priority ?? 1,
      roomId: event.roomId || null,
      expiresAfter: event.expiresAfter ?? 3,
      payload: event.payload,
      source: event.source || "Dungeon Director",
      status: "queued",
      note: event.note || "Queued by the Dungeon Director for later deterministic resolution.",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    dungeonMind.eventQueue.push(queuedEvent);
    queued.push(queuedEvent);
  });

  dungeonMind.eventQueue.sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));
  return queued;
}

export function eventTriggersForAction(action, state) {
  const triggers = ["NEXT_PLAYER_ACTION"];

  if (action.type === "MOVE") triggers.push("NEXT_ROOM_ENTER");
  if (["SEARCH", "INSPECT_FEATURE"].includes(action.type)) triggers.push("NEXT_SEARCH");
  if (["SEARCH", "INSPECT_FEATURE", "INSPECT_ITEM", "USE_ITEM", "LOOT"].includes(action.type)) {
    const room = state.rooms[state.currentRoomId];
    if (!room?.monster || room.monster.defeated) triggers.push("NEXT_SAFE_ACTION");
  }
  if (state.currentRoomId === "R10") triggers.push("NEXT_FINALE");

  return [...new Set(triggers)];
}

export function processEventQueue(triggers = [], state) {
  const dungeonMind = ensureEventState(state);
  const now = new Date().toISOString();
  const triggerSet = new Set(triggers);
  const resolved = [];

  dungeonMind.eventQueue.forEach(event => {
    if (event.status !== "queued" || !triggerSet.has(event.trigger)) return;

    event.status = "resolved";
    event.resolvedAt = now;
    event.effect = resolveEvent(event);
    resolved.push(event);
  });

  if (resolved.length) {
    dungeonMind.eventHistory.unshift(...resolved.map(event => ({ ...event })));
    dungeonMind.eventHistory = dungeonMind.eventHistory.slice(0, 30);
    state.log.unshift(...resolved.map(event => event.effect.log));
    if (state.log.length > 40) state.log.length = 40;
  }

  dungeonMind.eventQueue = dungeonMind.eventQueue.filter(event => event.status === "queued");
  ageQueuedEvents(dungeonMind);

  return resolved;
}

function resolveEvent(event) {
  const kind = event.payload?.kind || "UNKNOWN_EVENT";
  return {
    publicSafe: true,
    kind,
    log: EVENT_MESSAGES[kind] || "The dungeon shifts in a way you cannot quite explain.",
  };
}

function ageQueuedEvents(dungeonMind) {
  dungeonMind.eventQueue.forEach(event => {
    if (typeof event.expiresAfter !== "number") return;
    event.expiresAfter -= 1;
    if (event.expiresAfter < 0) event.status = "expired";
  });

  const expired = dungeonMind.eventQueue.filter(event => event.status === "expired");
  if (expired.length) {
    dungeonMind.eventHistory.unshift(...expired.map(event => ({ ...event, resolvedAt: new Date().toISOString() })));
    dungeonMind.eventHistory = dungeonMind.eventHistory.slice(0, 30);
  }

  dungeonMind.eventQueue = dungeonMind.eventQueue.filter(event => event.status === "queued");
}
