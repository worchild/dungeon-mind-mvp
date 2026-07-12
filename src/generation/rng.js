// Deterministic PRNG. Never use Math.random() for generated dungeon decisions.
export function hashSeed(seed) {
  const text = String(seed || "DUNGEON-MIND");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed) {
  let state = hashSeed(seed);
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new Error("rng.int requires integer min <= max");
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(values) {
      if (!Array.isArray(values) || values.length === 0) throw new Error("Cannot pick from an empty collection.");
      return values[this.int(0, values.length - 1)];
    },
    shuffle(values) {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = this.int(0, i);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

export function createSeed(prefix = "DM") {
  const entropy = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}-${entropy[0].toString(36)}-${entropy[1].toString(36)}`.toUpperCase();
}
