export function ensureLivingDungeonState(state) {
  if (!state.dungeonMind) state.dungeonMind = {};

  const living = state.dungeonMind.livingDungeon || {
    turn: 0,
    noiseLog: [],
    awareness: {},
    patrols: {},
    patrolHistory: [],
  };

  if (typeof living.turn !== "number") living.turn = 0;
  if (!Array.isArray(living.noiseLog)) living.noiseLog = [];
  if (!living.awareness || typeof living.awareness !== "object") living.awareness = {};
  if (!living.patrols || typeof living.patrols !== "object") living.patrols = {};
  if (!Array.isArray(living.patrolHistory)) living.patrolHistory = [];

  state.dungeonMind.livingDungeon = living;
  initialisePatrols(state, living);
  return living;
}

export function processLivingDungeon(action, state) {
  const living = ensureLivingDungeonState(state);
  living.turn += 1;

  const noise = recordNoise(action, state, living);
  updateAwareness(noise, state, living);
  const patrolResults = updatePatrols(action, state, living);

  const visibleLogs = [];
  if (noise?.visibleLog) visibleLogs.push(noise.visibleLog);
  patrolResults.forEach(result => {
    if (result.visibleLog) visibleLogs.push(result.visibleLog);
  });

  if (visibleLogs.length) {
    state.log.unshift(...visibleLogs);
    if (state.log.length > 40) state.log.length = 40;
  }

  return {
    turn: living.turn,
    noise,
    patrolResults,
    awareness: living.awareness,
    patrols: living.patrols,
    patrolHistory: living.patrolHistory,
  };
}

function initialisePatrols(state, living) {
  Object.values(state.rooms || {}).forEach(room => {
    if (!room.monster?.id || room.monster.defeated) return;
    const id = room.monster.id;

    if (!living.patrols[id]) {
      living.patrols[id] = {
        id,
        name: room.monster.name,
        currentRoomId: room.id,
        homeRoomId: room.id,
        lastRoomId: null,
        routeIndex: 0,
        alertLevel: 0,
        targetRoomId: null,
        active: true,
      };
    }

    if (!living.awareness[id]) {
      living.awareness[id] = {
        alertLevel: 0,
        lastNoise: null,
        targetRoomId: null,
        turnsSinceSignal: 0,
      };
    }
  });
}

function recordNoise(action, state, living) {
  const noiseMap = {
    MOVE: 1,
    SEARCH: 2,
    INSPECT_FEATURE: 1,
    USE_ITEM: 1,
    LOOT: 2,
    DEFEAT_MONSTER: 4,
  };

  const amount = noiseMap[action.type] || 0;
  if (!amount) return null;

  const noise = {
    id: `NOISE-${String(living.turn).padStart(4, "0")}`,
    actionType: action.type,
    amount,
    roomId: state.currentRoomId,
    turn: living.turn,
    createdAt: new Date().toISOString(),
  };

  if (amount >= 3) noise.visibleLog = "The sound carries through the nearby passages.";

  living.noiseLog.unshift(noise);
  living.noiseLog = living.noiseLog.slice(0, 20);
  return noise;
}

function updateAwareness(noise, state, living) {
  Object.values(living.patrols).forEach(patrol => {
    if (!patrol.active) return;
    const awareness = living.awareness[patrol.id];
    awareness.turnsSinceSignal += 1;

    if (!noise) {
      if (awareness.turnsSinceSignal > 4) awareness.alertLevel = Math.max(0, awareness.alertLevel - 1);
      patrol.alertLevel = awareness.alertLevel;
      return;
    }

    const distance = roomDistance(state, patrol.currentRoomId, noise.roomId);
    if (distance > 2) return;

    const alertGain = Math.max(0, noise.amount - distance);
    awareness.alertLevel = Math.min(5, awareness.alertLevel + alertGain);
    awareness.lastNoise = noise;
    awareness.targetRoomId = noise.roomId;
    awareness.turnsSinceSignal = 0;

    patrol.alertLevel = awareness.alertLevel;
    patrol.targetRoomId = noise.roomId;
  });
}

function updatePatrols(action, state, living) {
  const results = [];
  if (!["MOVE", "SEARCH", "LOOT", "USE_ITEM", "DEFEAT_MONSTER"].includes(action.type)) return results;

  Object.values(living.patrols).forEach(patrol => {
    if (!patrol.active) return;
    const monster = findRoomWithMonster(state, patrol.id);
    if (!monster.room || monster.entity?.defeated) {
      patrol.active = false;
      return;
    }

    patrol.currentRoomId = monster.room.id;
    if (!shouldMovePatrol(action, state, patrol)) return;

    const nextRoomId = chooseNextRoom(state, patrol);
    if (!nextRoomId || nextRoomId === patrol.currentRoomId) return;

    const fromRoomId = patrol.currentRoomId;
    movePatrolEntity(state, patrol, nextRoomId);

    const result = {
      id: patrol.id,
      name: patrol.name,
      fromRoomId,
      toRoomId: nextRoomId,
      turn: living.turn,
      alertLevel: patrol.alertLevel,
      visibleLog: patrolLogForPlayer(state, patrol, fromRoomId, nextRoomId),
    };

    living.patrolHistory.unshift(result);
    living.patrolHistory = living.patrolHistory.slice(0, 20);
    results.push(result);
  });

  return results;
}

function shouldMovePatrol(action, state, patrol) {
  if (state.threat?.value >= 7) return true;
  if (patrol.alertLevel >= 3) return true;
  return ["MOVE", "SEARCH", "LOOT", "USE_ITEM"].includes(action.type) && state.threat?.value >= 3;
}

function chooseNextRoom(state, patrol) {
  const currentRoom = state.rooms[patrol.currentRoomId];
  if (!currentRoom?.exits?.length) return patrol.currentRoomId;

  if (patrol.targetRoomId) {
    const direct = currentRoom.exits.find(exit => exit.to === patrol.targetRoomId);
    if (direct) return direct.to;
  }

  const options = currentRoom.exits.map(exit => exit.to).filter(roomId => roomId !== patrol.lastRoomId);
  const pool = options.length ? options : currentRoom.exits.map(exit => exit.to);
  patrol.routeIndex = (patrol.routeIndex + 1) % pool.length;
  return pool[patrol.routeIndex];
}

function movePatrolEntity(state, patrol, nextRoomId) {
  const currentRoom = state.rooms[patrol.currentRoomId];
  const nextRoom = state.rooms[nextRoomId];
  if (!currentRoom?.monster || !nextRoom) return;

  const entity = currentRoom.monster;
  currentRoom.monster = null;
  nextRoom.monster = entity;

  patrol.lastRoomId = patrol.currentRoomId;
  patrol.currentRoomId = nextRoomId;
  if (patrol.targetRoomId === nextRoomId) patrol.targetRoomId = null;
}

function patrolLogForPlayer(state, patrol, fromRoomId, toRoomId) {
  if (toRoomId === state.currentRoomId) return `${patrol.name} moves into the chamber.`;

  const playerRoom = state.rooms[state.currentRoomId];
  const nearby = playerRoom?.exits?.some(exit => exit.to === toRoomId || exit.to === fromRoomId);
  if (nearby) return `You hear movement nearby: ${patrol.name} is on patrol.`;
  return null;
}

function findRoomWithMonster(state, id) {
  for (const room of Object.values(state.rooms || {})) {
    if (room.monster?.id === id) return { room, entity: room.monster };
  }
  return { room: null, entity: null };
}

function roomDistance(state, startRoomId, targetRoomId) {
  if (startRoomId === targetRoomId) return 0;
  const visited = new Set([startRoomId]);
  const queue = [{ roomId: startRoomId, distance: 0 }];

  while (queue.length) {
    const current = queue.shift();
    const room = state.rooms[current.roomId];
    if (!room) continue;

    for (const exit of room.exits || []) {
      if (visited.has(exit.to)) continue;
      if (exit.to === targetRoomId) return current.distance + 1;
      visited.add(exit.to);
      queue.push({ roomId: exit.to, distance: current.distance + 1 });
    }
  }

  return 99;
}
