export const DungeonDirector = {
  evaluate(state) {
    return {
      status: "ok",
      tension: state.threat?.level ?? 0,
      recommendation: "continue_exploration",
    };
  },
};
