import { SCHEMA_VERSION } from "../state/store.js";

export function validateState(state) {
  const errors = [];
  if (!state) return ["State is missing."];
  if (state.schemaVersion !== SCHEMA_VERSION) errors.push("Schema version mismatch.");
  if (!state.rooms || typeof state.rooms !== "object") errors.push("Rooms collection is missing.");
  if (state.rooms && !state.rooms[state.currentRoomId]) errors.push("Current room does not exist.");

  const ids = Object.keys(state.rooms || {});
  const seen = new Set();
  ids.forEach(id => {
    if (seen.has(id)) errors.push(`Duplicate room id ${id}.`);
    seen.add(id);
    const room = state.rooms[id];
    if (room.id !== id) errors.push(`${id} has mismatched id.`);
    if (!room.finale && (!room.exits || room.exits.length === 0)) errors.push(`${id} has no exits and is not finale.`);
    (room.exits || []).forEach(exit => {
      if (!state.rooms[exit.to]) errors.push(`${id} exit ${exit.dir} points to missing room ${exit.to}.`);
    });
    const visible = JSON.stringify(room.playerVisible || {});
    if (visible.includes("hidden") || visible.includes("dmNotes")) errors.push(`${id} playerVisible may leak hidden data.`);
  });

  if (!state.threat) errors.push("Threat state is missing.");
  else if (state.threat.value < 0 || state.threat.value > state.threat.max) errors.push("Threat out of bounds.");

  return errors;
}
