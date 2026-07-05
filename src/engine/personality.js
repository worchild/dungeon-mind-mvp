export const DEFAULT_DUNGEON_PERSONALITY = {
  name: "Watch-Fort Reliquary",
  archetype: "ancient crypt",
  traits: {
    aggression: 0.45,
    mystery: 0.85,
    greed: 0.35,
    mercy: 0.25,
    exploration: 0.75,
    storyFocus: 0.9,
    puzzleFocus: 0.8,
  },
};

export function ensurePersonality(state) {
  if (!state.dungeonMind) state.dungeonMind = {};

  if (!state.dungeonMind.personality) {
    state.dungeonMind.personality = structuredClone(DEFAULT_DUNGEON_PERSONALITY);
  }

  const traits = state.dungeonMind.personality.traits || {};
  state.dungeonMind.personality.traits = {
    ...DEFAULT_DUNGEON_PERSONALITY.traits,
    ...traits,
  };

  return state.dungeonMind.personality;
}

export function personalityModifier(personality, trait, scale = 1) {
  const value = personality?.traits?.[trait] ?? DEFAULT_DUNGEON_PERSONALITY.traits[trait] ?? 0.5;
  return (value - 0.5) * scale;
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function clampPriority(value) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function describePersonality(personality) {
  const traits = personality?.traits || DEFAULT_DUNGEON_PERSONALITY.traits;
  const strongest = Object.entries(traits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([trait, value]) => `${trait}:${value.toFixed(2)}`);

  return `${personality?.name || DEFAULT_DUNGEON_PERSONALITY.name} (${personality?.archetype || DEFAULT_DUNGEON_PERSONALITY.archetype}) — strongest traits: ${strongest.join(", ")}`;
}
