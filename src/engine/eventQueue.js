const EVENT_LIBRARY = {
  ATMOSPHERE: [
    { kind: "DUST_DRIFT", log: "Dust drifts upward from the floor, as if the dungeon is quietly breathing in." },
    { kind: "COLD_DRAFT", log: "A cold draft slips through the chamber, carrying the smell of wet stone and old metal." },
    { kind: "FALLING_DUST", log: "Dust falls from the ceiling in a thin grey veil, though nothing above you moves." },
    { kind: "WALL_WHISPER", log: "A whisper travels through the wall stones, too soft to be words and too deliberate to be wind." },
    { kind: "TORCH_SPUTTER", log: "The light gutters for a heartbeat. The shadows stay still a little too long." },
    { kind: "OLD_BELL", log: "Far below, a cracked bell gives one dull note and then goes silent." },
    { kind: "WATER_ECHO", log: "Somewhere unseen, water drips in a rhythm almost like counting." },
    { kind: "STONE_EXHALE", log: "The stones around you seem to exhale, settling with a tired groan." }
  ],
  TENSION: [
    { kind: "DISTANT_FOOTSTEPS", log: "You hear distant footsteps somewhere beyond the walls. They stop when you stop." },
    { kind: "DOOR_CREAK", log: "Somewhere nearby, an old door creaks open and then quietly closes again." },
    { kind: "METAL_SCRAPE", log: "A long metallic scrape echoes through the passage, then cuts off sharply." },
    { kind: "CHAIN_TIGHTEN", log: "Chains rattle in the dark, tightening one link at a time." },
    { kind: "HEAVY_BREATH", log: "A heavy breath moves through the corridor ahead. It is not yours." },
    { kind: "STATUE_SHIFT", log: "One of the statues is facing a slightly different way than before. Probably fine. Definitely not fine." },
    { kind: "LOW_GROWL", log: "A low growl rolls through the stone, more felt in your ribs than heard." },
    { kind: "SUDDEN_SILENCE", log: "Every small dungeon sound stops at once, leaving a silence with teeth." }
  ],
  DISCOVERY: [
    { kind: "LOOSE_STONE", log: "A loose stone shifts under your boot, revealing a hairline seam nearby." },
    { kind: "GLINTING_MARK", log: "A tiny glint catches your eye where dust has thinned over an old mark." },
    { kind: "DRAFT_HINT", log: "A faint draft seems stronger from one passage than the others." },
    { kind: "HIDDEN_SCRATCH", log: "Fresh-looking scratches interrupt the older carvings. Someone else noticed this place too." },
    { kind: "WAX_FLAKE", log: "A flake of black wax falls from above, pointing your attention to a narrow crack." },
    { kind: "SUN_GLIMMER", log: "A thread of warm light glimmers briefly, then vanishes before you can decide where it began." }
  ],
  RESPONSE: [
    { kind: "GREED_BELL", log: "A heavy bell rings once in the distance. The sound feels accusatory." },
    { kind: "WAKEFUL_STONE", log: "The stone beneath your feet grows warmer. The dungeon has noticed the pattern of your choices." },
    { kind: "PRESSURE_RISE", log: "The air presses closer, as though the dungeon is leaning in to listen." },
    { kind: "SEAL_CHIME", log: "A soft chime answers from deep within the reliquary path." }
  ]
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
    events.push(makeLibraryEvent({
      category: state.threat?.value >= 4 ? "TENSION" : "ATMOSPHERE",
      trigger: "NEXT_ROOM_ENTER",
      priority: 2,
      state,
      note: "Scheduled after close investigation to make the dungeon feel alert.",
    }));
  }

  if (state.threat?.value >= 5 && ["LOOT", "USE_ITEM", "INSPECT_ITEM"].includes(action.type)) {
    events.push(makeLibraryEvent({
      category: "RESPONSE",
      trigger: "NEXT_SAFE_ACTION",
      priority: 3,
      state,
      note: "Scheduled because threat is high and the dungeon should react to player choices.",
    }));
  }

  if (action.type === "MOVE" && state.threat?.value >= 3) {
    events.push(makeLibraryEvent({
      category: "ATMOSPHERE",
      trigger: "NEXT_PLAYER_ACTION",
      priority: 1,
      state,
      note: "Scheduled as low-pressure atmosphere while the player moves through an awakening dungeon.",
    }));
  }

  if (["INSPECT_FEATURE", "SEARCH"].includes(action.type) && (state.player?.clues?.length || 0) >= 2) {
    events.push(makeLibraryEvent({
      category: "DISCOVERY",
      trigger: "NEXT_SAFE_ACTION",
      priority: 2,
      state,
      note: "Scheduled to reward careful clue hunting with a subtle discovery beat.",
    }));
  }

  return enqueueEvents(state, events.filter(Boolean), dungeonMind);
}

function makeLibraryEvent({ category, trigger, priority, state, note }) {
  const selected = chooseUnusedLibraryEntry(category, trigger, state);
  if (!selected) return null;

  return {
    type: category,
    trigger,
    priority,
    payload: { kind: selected.kind, category },
    source: "Dungeon Director",
    note,
  };
}

function chooseUnusedLibraryEntry(category, trigger, state) {
  const dungeonMind = ensureEventState(state);
  const library = EVENT_LIBRARY[category] || EVENT_LIBRARY.ATMOSPHERE;
  const usedKinds = new Set([
    ...dungeonMind.eventQueue.map(event => event.payload?.kind),
    ...dungeonMind.eventHistory.map(event => event.payload?.kind),
  ]);

  const available = library.filter(entry => !usedKinds.has(entry.kind));
  const pool = available.length ? available : library;
  if (!pool.length) return null;

  const seed = `${state.currentRoomId}-${trigger}-${category}-${dungeonMind.eventCounter}-${state.threat?.value ?? 0}`;
  const index = deterministicIndex(seed, pool.length);
  return pool[index];
}

function deterministicIndex(seed, length) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
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
  const category = event.payload?.category || event.type || "ATMOSPHERE";
  const library = EVENT_LIBRARY[category] || [];
  const match = library.find(entry => entry.kind === kind);

  return {
    publicSafe: true,
    kind,
    category,
    log: match?.log || "The dungeon shifts in a way you cannot quite explain.",
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
