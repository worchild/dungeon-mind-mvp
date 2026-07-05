export const NarratorFilter = {
  buildContext(state, advice) {
    const currentRoomId = state.player?.currentRoomId;
    const currentRoom = state.rooms?.[currentRoomId];

    return {
      currentRoom: {
        id: currentRoomId,
        name: currentRoom?.name ?? "Unknown Room",
        description: currentRoom?.description ?? "",
        exits: currentRoom?.exits ?? [],
        visibleFeatures: currentRoom?.visibleFeatures ?? [],
      },
      mood: state.theme?.mood ?? "neutral",
      adviceSummary: {
        pacing: advice.director?.recommendation,
        danger: advice.encounter?.recommendation,
        reward: advice.quartermaster?.recommendation,
      },
    };
  },
};
