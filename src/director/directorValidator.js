export function validateDungeonDirector(director) {
  const errors = [];
  const warnings = [];

  if (!director || typeof director !== "object") {
    return {
      ok: false,
      errors: ["Director must be an object."],
      warnings,
    };
  }

  validateRequiredObject(director, "metadata", errors);
  validateRequiredObject(director, "objective", errors);
  validateRequiredObject(director, "theme", errors);
  validateRequiredObject(director, "mood", errors);
  validateRequiredObject(director, "threat", errors);
  validateRequiredObject(director, "roomGraph", errors);
  validateRequiredObject(director, "clueNetwork", errors);
  validateRequiredObject(director, "puzzleState", errors);
  validateRequiredObject(director, "lore", errors);
  validateRequiredObject(director, "encounterBudget", errors);
  validateRequiredObject(director, "treasureBudget", errors);

  if (!Array.isArray(director.eventQueue)) {
    errors.push("eventQueue must be an array.");
  }

  validateThreat(director.threat, errors);
  validateBudget(director.encounterBudget, "encounterBudget", errors);
  validateBudget(director.treasureBudget, "treasureBudget", errors);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function validateRequiredObject(parent, key, errors) {
  if (
    !parent[key] ||
    typeof parent[key] !== "object" ||
    Array.isArray(parent[key])
  ) {
    errors.push(`${key} must be an object.`);
  }
}

function validateThreat(threat, errors) {
  if (!threat || typeof threat !== "object") return;

  if (!Number.isFinite(threat.current)) {
    errors.push("threat.current must be a number.");
  }

  if (!Number.isFinite(threat.maximum)) {
    errors.push("threat.maximum must be a number.");
  }

  if (!Number.isFinite(threat.escalation)) {
    errors.push("threat.escalation must be a number.");
  }

  if (threat.current < 0) {
    errors.push("threat.current cannot be negative.");
  }

  if (threat.maximum < 0) {
    errors.push("threat.maximum cannot be negative.");
  }

  if (threat.current > threat.maximum) {
    errors.push("threat.current cannot exceed threat.maximum.");
  }
}

function validateBudget(budget, name, errors) {
  if (!budget || typeof budget !== "object") return;

  if (!Number.isFinite(budget.total)) {
    errors.push(`${name}.total must be a number.`);
  }

  if (!Number.isFinite(budget.spent)) {
    errors.push(`${name}.spent must be a number.`);
  }

  if (budget.total < 0) {
    errors.push(`${name}.total cannot be negative.`);
  }

  if (budget.spent < 0) {
    errors.push(`${name}.spent cannot be negative.`);
  }

  if (budget.spent > budget.total) {
    errors.push(`${name}.spent cannot exceed ${name}.total.`);
  }
}
