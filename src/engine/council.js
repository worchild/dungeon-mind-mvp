import { ensurePersonality, personalityModifier, clamp01, clampPriority, describePersonality } from "./personality.js?v=0.7.0";

export function consultCouncil(action, state, errors = []) {
  const room = state?.rooms?.[state.currentRoomId];
  const actionType = action?.type || "UNKNOWN";
  const context = buildContext(actionType, state, room, errors);

  const council = {
    cartographer: adviseCartographer(context),
    encounterMaster: adviseEncounterMaster(context),
    quartermaster: adviseQuartermaster(context),
    storyteller: adviseStoryteller(context),
    puzzleMaster: advisePuzzleMaster(context),
    narratorVisibilityFilter: adviseNarratorVisibilityFilter(context),
  };

  council.dungeonDirector = adviseDungeonDirector(context, council);

  const directorDecision = makeDirectorDecision(context, council);
  const actionQueue = buildActionQueue(context, directorDecision);

  return {
    action: actionType,
    room: room ? { id: room.id, name: room.name } : null,
    personality: {
      profile: context.personality,
      summary: describePersonality(context.personality),
      influence: context.personalityInfluence,
    },
    council,
    directorDecision,
    actionQueue,
    validator: {
      ok: errors.length === 0,
      errors,
    },
    generatedAt: new Date().toISOString(),
  };
}

function buildContext(actionType, state, room, errors) {
  const cluesFound = state?.player?.clues?.length || 0;
  const cluesRequired = state?.objective?.requiredClueIds?.length || 0;
  const personality = ensurePersonality(state);

  return {
    actionType,
    state,
    room,
    errors,
    personality,
    personalityInfluence: {
      encounterBias: personalityModifier(personality, "aggression", 2),
      mysteryBias: personalityModifier(personality, "mystery", 2),
      rewardBias: personalityModifier(personality, "greed", 2),
      mercyBias: personalityModifier(personality, "mercy", 2),
      explorationBias: personalityModifier(personality, "exploration", 2),
      storyBias: personalityModifier(personality, "storyFocus", 2),
      puzzleBias: personalityModifier(personality, "puzzleFocus", 2),
    },
    threat: state?.threat?.value ?? 0,
    maxThreat: state?.threat?.max ?? 10,
    inventoryCount: state?.player?.inventory?.length || 0,
    visitedRooms: state?.player?.visitedRooms?.length || 0,
    cluesFound,
    cluesRequired,
    clueRatio: cluesRequired ? cluesFound / cluesRequired : 1,
    objectiveComplete: Boolean(state?.objective?.complete),
    hasUnclaimedLoot: Boolean(room?.loot?.length && !state?.player?.lootedRooms?.includes(room.id)),
    hasActiveMonster: Boolean(room?.monster && !room.monster.defeated),
    isFinale: Boolean(room?.finale),
  };
}

function advice({ status, priority, confidence, recommendation, reason, disagreesWith = [], risk = "None", proposedAction = null, personalityNote = "" }) {
  return { status, priority, confidence, recommendation, reason, disagreesWith, risk, proposedAction, personalityNote };
}

function withPriority(base, bias) {
  return clampPriority(base - bias);
}

function withConfidence(base, bias) {
  return clamp01(base + bias * 0.08);
}

function adviseDungeonDirector(context, council) {
  if (context.errors.length) {
    return advice({
      status: "BLOCKED",
      priority: 1,
      confidence: 1,
      recommendation: "Pause progression until validation errors are resolved.",
      reason: "The validator returned one or more state integrity errors.",
      proposedAction: { type: "REPAIR_STATE", trigger: "IMMEDIATE_DEV_REVIEW" },
      personalityNote: "Personality cannot override validator failure.",
    });
  }

  const highestPriority = getRankedRecommendations(council, context)[0];

  if (context.objectiveComplete) {
    return advice({
      status: "COMPLETE",
      priority: 1,
      confidence: 0.95,
      recommendation: "Prepare end-state, victory narration, and replay notes.",
      reason: "The objective flag is complete.",
      proposedAction: { type: "PREPARE_VICTORY_BEAT", trigger: "NEXT_PLAYER_ACTION" },
      personalityNote: "Story focus shapes the end-state presentation, not the win condition.",
    });
  }

  return advice({
    status: "DIRECTING",
    priority: highestPriority?.priority ?? 3,
    confidence: highestPriority?.confidence ?? 0.75,
    recommendation: highestPriority ? `Prioritise ${highestPriority.source}: ${highestPriority.recommendation}` : "Maintain pacing and continue monitoring Council advice.",
    reason: highestPriority ? `Highest-ranked Council recommendation came from ${highestPriority.source}.` : "No higher-priority Council recommendation was available.",
    proposedAction: highestPriority?.proposedAction || { type: "MAINTAIN_PACING", trigger: "NEXT_ROOM_ENTER" },
    personalityNote: `Director ranking is biased by ${context.personality.name}.`,
  });
}

function adviseCartographer(context) {
  if (!context.room) {
    return advice({
      status: "MISSING_ROOM",
      priority: 1,
      confidence: 1,
      recommendation: "Restore a valid current room before rendering map guidance.",
      reason: "No current room could be found from state.currentRoomId.",
      risk: "Player navigation may break.",
      proposedAction: { type: "REPAIR_ROOM_POINTER", trigger: "IMMEDIATE_DEV_REVIEW", source: "cartographer" },
    });
  }

  const exits = context.room?.exits?.length || 0;
  const bias = context.personalityInfluence.explorationBias;

  return advice({
    status: "OK",
    priority: exits === 0 ? 2 : withPriority(4, bias),
    confidence: withConfidence(0.85, bias),
    recommendation: `Keep ${context.room.id} exits player-visible only and preserve map continuity.`,
    reason: `${context.visitedRooms} room(s) visited. Current room has ${exits} visible exit(s).`,
    risk: exits === 0 && !context.isFinale ? "Non-finale dead end may stall exploration." : "None",
    proposedAction: exits === 0 && !context.isFinale
      ? { type: "REVIEW_EXIT_CONNECTIVITY", trigger: "NEXT_DEV_REVIEW", source: "cartographer" }
      : { type: "MAINTAIN_MAP_CONTINUITY", trigger: "NEXT_ROOM_ENTER", source: "cartographer" },
    personalityNote: `Exploration trait adjusts map-continuity priority by ${bias.toFixed(2)}.`,
  });
}

function adviseEncounterMaster(context) {
  const bias = context.personalityInfluence.encounterBias;

  if (context.hasActiveMonster) {
    return advice({
      status: "ACTIVE_ENCOUNTER",
      priority: withPriority(2, bias),
      confidence: withConfidence(0.92, bias),
      recommendation: `Keep ${context.room.monster.name} present until defeated.`,
      reason: "The current room has an undefeated monster.",
      disagreesWith: context.hasUnclaimedLoot ? ["quartermaster"] : [],
      risk: context.hasUnclaimedLoot ? "Loot temptation may distract from unresolved danger." : "Unresolved encounter blocks room safety.",
      proposedAction: { type: "FOCUS_ACTIVE_ENCOUNTER", trigger: "NEXT_PLAYER_ACTION", source: "encounterMaster" },
      personalityNote: `Aggression trait adjusts encounter priority by ${bias.toFixed(2)}.`,
    });
  }

  if (context.threat >= 8) {
    return advice({
      status: "ESCALATE",
      priority: withPriority(2, bias),
      confidence: withConfidence(0.8, bias),
      recommendation: "Increase future encounter pressure.",
      reason: "Threat is at or above the high-alert threshold.",
      disagreesWith: ["quartermaster"],
      risk: "More danger may reduce player breathing room.",
      proposedAction: { type: "INCREASE_ENCOUNTER_PRESSURE", trigger: "NEXT_ROOM_ENTER", source: "encounterMaster" },
      personalityNote: `Aggression trait adjusts escalation confidence by ${bias.toFixed(2)}.`,
    });
  }

  return advice({
    status: "OK",
    priority: withPriority(5, bias),
    confidence: withConfidence(0.7, bias),
    recommendation: "No encounter escalation required.",
    reason: "The current room has no active undefeated monster.",
    personalityNote: `Aggression trait keeps encounter pressure at ${context.personality.traits.aggression.toFixed(2)}.`,
  });
}

function adviseQuartermaster(context) {
  const bias = context.personalityInfluence.rewardBias;

  if (context.actionType === "LOOT") {
    return advice({
      status: "UPDATED",
      priority: withPriority(4, bias),
      confidence: withConfidence(0.9, bias),
      recommendation: `Inventory now has ${context.inventoryCount} item(s).`,
      reason: "The latest action was LOOT.",
      proposedAction: { type: "AUDIT_REWARD_BALANCE", trigger: "NEXT_DEV_REVIEW", source: "quartermaster" },
      personalityNote: `Greed trait adjusts reward attention by ${bias.toFixed(2)}.`,
    });
  }

  if (context.hasUnclaimedLoot) {
    return advice({
      status: "AVAILABLE",
      priority: withPriority(context.hasActiveMonster ? 4 : 3, bias),
      confidence: withConfidence(0.86, bias),
      recommendation: "Loot is available but not yet collected.",
      reason: "The current room has loot and is not listed in player.lootedRooms.",
      disagreesWith: context.hasActiveMonster || context.threat >= 8 ? ["encounterMaster"] : [],
      risk: context.hasActiveMonster ? "Reward conflicts with active danger." : "Unclaimed reward may be missed.",
      proposedAction: { type: "REMIND_AVAILABLE_LOOT", trigger: "NEXT_SAFE_ROOM_ACTION", source: "quartermaster" },
      personalityNote: `Greed trait adjusts loot priority by ${bias.toFixed(2)}.`,
    });
  }

  return advice({
    status: "OK",
    priority: withPriority(5, bias),
    confidence: withConfidence(0.74, bias),
    recommendation: `Inventory stable at ${context.inventoryCount} item(s).`,
    reason: "No loot state changed this action.",
    personalityNote: `Greed trait is ${context.personality.traits.greed.toFixed(2)}.`,
  });
}

function adviseStoryteller(context) {
  const bias = context.personalityInfluence.storyBias + context.personalityInfluence.mysteryBias * 0.5;
  const roomName = context.room?.name || "unknown room";
  const basePriority = context.threat >= 8 ? 2 : 3;

  return advice({
    status: context.threat >= 8 ? "TENSION_HIGH" : "OK",
    priority: withPriority(basePriority, bias),
    confidence: withConfidence(0.82, bias),
    recommendation: `Frame the next narrative beat around ${context.actionType} in ${roomName}.`,
    reason: `Threat is currently ${context.threat}; narration should match this tension level without revealing hidden state.`,
    disagreesWith: context.threat >= 8 && context.hasUnclaimedLoot ? ["quartermaster"] : [],
    risk: context.threat >= 8 ? "Narration may need to foreshadow danger over reward." : "None",
    proposedAction: { type: context.threat >= 8 ? "DARKEN_NARRATION" : "MAINTAIN_TONE", trigger: "NEXT_NARRATION", source: "storyteller" },
    personalityNote: `Story and mystery traits adjust narrative priority by ${bias.toFixed(2)}.`,
  });
}

function advisePuzzleMaster(context) {
  const bias = context.personalityInfluence.puzzleBias + context.personalityInfluence.mysteryBias * 0.5;

  if (context.isFinale) {
    const safeToResolve = context.cluesFound >= context.cluesRequired;
    return advice({
      status: safeToResolve ? "READY" : "INCOMPLETE_CLUES",
      priority: withPriority(safeToResolve ? 2 : 1, bias),
      confidence: withConfidence(0.93, bias),
      recommendation: safeToResolve ? "Finale support is sufficient; allow safe objective completion." : "Warn that the finale can be forced but is safer with more clues.",
      reason: `Clues found: ${context.cluesFound}/${context.cluesRequired}.`,
      disagreesWith: safeToResolve ? [] : ["quartermaster"],
      risk: safeToResolve ? "None" : "Objective may complete with penalty if clues are missing.",
      proposedAction: { type: safeToResolve ? "ALLOW_SAFE_FINALE" : "SIGNAL_MISSING_CLUES", trigger: "NEXT_FINALE_ACTION", source: "puzzleMaster" },
      personalityNote: `Puzzle and mystery traits adjust finale priority by ${bias.toFixed(2)}.`,
    });
  }

  return advice({
    status: "OK",
    priority: withPriority(context.clueRatio < 0.5 ? 3 : 4, bias),
    confidence: withConfidence(0.84, bias),
    recommendation: `Clue progress is ${context.cluesFound}/${context.cluesRequired}. Do not reveal hidden solution data.`,
    reason: "Puzzle support should remain implicit until clues are discovered through player action.",
    proposedAction: context.clueRatio < 0.5
      ? { type: "NUDGE_TOWARD_CLUES", trigger: "NEXT_SEARCH_OPPORTUNITY", source: "puzzleMaster" }
      : { type: "MAINTAIN_PUZZLE_PACING", trigger: "NEXT_ROOM_ENTER", source: "puzzleMaster" },
    personalityNote: `Puzzle and mystery traits adjust clue guidance by ${bias.toFixed(2)}.`,
  });
}

function adviseNarratorVisibilityFilter(context) {
  return advice({
    status: context.room ? "OK" : "BLOCKED",
    priority: 1,
    confidence: 0.98,
    recommendation: context.room ? "Player output should use playerVisible fields only." : "Do not narrate until a valid room is available.",
    reason: "Hidden state, objective mechanics, clue logic, personality weights, and Council reasoning must remain behind the screen.",
    risk: "Leaking hidden state would damage the game loop.",
    proposedAction: { type: context.room ? "FILTER_PLAYER_OUTPUT" : "SUPPRESS_NARRATION", trigger: context.room ? "EVERY_RENDER" : "IMMEDIATE", source: "narratorVisibilityFilter" },
    personalityNote: "Visibility filtering is not weakened by personality.",
  });
}

function getRankedRecommendations(council, context) {
  const sourceBias = {
    encounterMaster: context.personalityInfluence.encounterBias,
    quartermaster: context.personalityInfluence.rewardBias,
    storyteller: context.personalityInfluence.storyBias,
    puzzleMaster: context.personalityInfluence.puzzleBias,
    cartographer: context.personalityInfluence.explorationBias,
    narratorVisibilityFilter: 0,
  };

  return Object.entries(council)
    .filter(([source]) => source !== "dungeonDirector")
    .map(([source, memberAdvice]) => ({
      source,
      ...memberAdvice,
      directorScore: memberAdvice.priority - (sourceBias[source] || 0) - memberAdvice.confidence,
    }))
    .sort((a, b) => a.directorScore - b.directorScore);
}

function makeDirectorDecision(context, council) {
  if (context.errors.length) {
    return {
      status: "BLOCKED",
      chosenRecommendation: council.dungeonDirector,
      rejectedRecommendations: getRankedRecommendations(council, context).map(item => ({ source: item.source, recommendation: item.recommendation, reason: "Rejected because validator errors must be resolved first." })),
      rationale: "Validation failures override all other Council advice.",
      nextIntent: "Repair state before continuing play.",
      personalityNote: "Personality cannot override validation.",
    };
  }

  const ranked = getRankedRecommendations(council, context);
  const chosen = ranked[0] || { source: "dungeonDirector", ...council.dungeonDirector };
  const rejected = ranked.slice(1).map(item => ({
    source: item.source,
    recommendation: item.recommendation,
    reason: item.priority === chosen.priority ? "Lower confidence or weaker personality fit than the chosen recommendation." : "Lower ranked Director score than the chosen recommendation.",
  }));

  return {
    status: "DECIDED",
    chosenSource: chosen.source,
    chosenRecommendation: {
      status: chosen.status,
      priority: chosen.priority,
      confidence: chosen.confidence,
      recommendation: chosen.recommendation,
      reason: chosen.reason,
      proposedAction: chosen.proposedAction,
      personalityNote: chosen.personalityNote,
      directorScore: chosen.directorScore,
    },
    rejectedRecommendations: rejected,
    disagreements: collectDisagreements(council),
    rationale: `Director selected ${chosen.source} using priority, confidence, and personality fit for ${context.personality.name}.`,
    nextIntent: chosen.proposedAction ? `${chosen.proposedAction.type} on ${chosen.proposedAction.trigger}` : "Monitor the next player action.",
    personalityNote: describePersonality(context.personality),
  };
}

function collectDisagreements(council) {
  return Object.entries(council)
    .filter(([source, memberAdvice]) => source !== "dungeonDirector" && memberAdvice.disagreesWith?.length)
    .map(([source, memberAdvice]) => ({ source, disagreesWith: memberAdvice.disagreesWith, risk: memberAdvice.risk, reason: memberAdvice.reason }));
}

function buildActionQueue(context, directorDecision) {
  if (directorDecision.status === "BLOCKED") {
    return [{ type: "REPAIR_STATE", trigger: "IMMEDIATE_DEV_REVIEW", source: "dungeonDirector", priority: 1, status: "queued" }];
  }

  const proposedAction = directorDecision.chosenRecommendation?.proposedAction;
  if (!proposedAction) {
    return [{ type: "MONITOR_NEXT_ACTION", trigger: "NEXT_PLAYER_ACTION", source: "dungeonDirector", priority: 5, status: "queued" }];
  }

  return [{ ...proposedAction, priority: directorDecision.chosenRecommendation.priority, confidence: directorDecision.chosenRecommendation.confidence, status: "queued", note: "Queued as future intent only; no automatic state mutation has occurred." }];
}
