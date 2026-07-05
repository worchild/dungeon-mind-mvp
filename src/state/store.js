export const SCHEMA_VERSION = "1.0";
export const APP_VERSION = "0.8.0";
export const STORAGE_KEY = "dungeonMindMvpSaveV080";

let state = null;
let clueBook = {};

export async function loadDungeonContent(path = "./data/dungeon.json") {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load dungeon content: ${response.status}`);
  const content = await response.json();
  state = structuredClone(content.initialState);
  clueBook = content.clueBook || {};
  return { state, clueBook };
}

export function getState() { return state; }
export function setState(nextState) { state = nextState; return state; }
export function getClueBook() { return clueBook; }
export function cloneInitialStateFromContent(content) { return structuredClone(content.initialState); }

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  state = JSON.parse(raw);
  return state;
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}
