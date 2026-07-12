export function validateGeneratedDungeon(dungeon) {
  const errors = [];
  const rooms = dungeon?.rooms || {};
  const ids = Object.keys(rooms);
  if (!dungeon?.generation?.seed) errors.push("Generation seed is missing.");
  if (!ids.length) return [...errors, "Generated dungeon has no rooms."];
  if (!rooms[dungeon.entranceRoomId]) errors.push("Entrance room is missing.");
  if (!rooms[dungeon.finaleRoomId]) errors.push("Finale room is missing.");
  if (dungeon.entranceRoomId === dungeon.finaleRoomId) errors.push("Entrance and finale must differ.");

  const coordinates = new Set();
  ids.forEach(id => {
    const room = rooms[id];
    const coordinate = Array.isArray(room.map) ? room.map.join(",") : "missing";
    if (coordinates.has(coordinate)) errors.push(`Rooms overlap at ${coordinate}.`);
    coordinates.add(coordinate);
    (room.exits || []).forEach(exit => {
      const target = rooms[exit.to];
      if (!target) errors.push(`${id} points to missing room ${exit.to}.`);
      else if (!(target.exits || []).some(back => back.to === id)) errors.push(`${id} -> ${exit.to} is not reciprocal.`);
    });
  });

  if (rooms[dungeon.entranceRoomId]) {
    const reached = new Set([dungeon.entranceRoomId]);
    const queue = [dungeon.entranceRoomId];
    while (queue.length) {
      const id = queue.shift();
      (rooms[id].exits || []).forEach(exit => {
        if (!reached.has(exit.to) && rooms[exit.to]) {
          reached.add(exit.to);
          queue.push(exit.to);
        }
      });
    }
    if (reached.size !== ids.length) errors.push(`Only ${reached.size}/${ids.length} rooms are reachable.`);
    if (!reached.has(dungeon.finaleRoomId)) errors.push("Finale is unreachable.");
  }

  const required = dungeon.objective?.requiredClueIds || [];
  required.forEach(clueId => {
    const clue = dungeon.clueBook?.[clueId];
    if (!clue) errors.push(`Required clue ${clueId} is missing.`);
    else if (!rooms[clue.foundIn]) errors.push(`Required clue ${clueId} has an invalid room.`);
    else if (clue.foundIn === dungeon.finaleRoomId) errors.push(`Required clue ${clueId} is placed in the finale.`);
  });
  return errors;
}
