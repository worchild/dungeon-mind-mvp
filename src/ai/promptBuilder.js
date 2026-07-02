// Placeholder for Sprint 4+.
// This module must only receive player-visible room data, never hidden Dungeon Mind state.
export function buildPlayerSafeRoomImagePrompt(room) {
  return {
    roomId: room.id,
    name: room.name,
    description: room.playerVisible.description,
    features: room.playerVisible.features
  };
}
