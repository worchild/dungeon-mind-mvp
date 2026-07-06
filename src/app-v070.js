import { initialiseGame, dispatch } from "./engine/rules.js?v=1.0.0";
import { getState } from "./state/store.js?v=1.0.0";
import { render, renderCouncilDebug } from "./ui/renderer.js?v=1.0.0";

let latestCouncilResult = null;

function run(action) {
  const result = dispatch(action);
  latestCouncilResult = result?.councilResult || null;
  render();
  renderCouncilDebug(latestCouncilResult);
}

function exportSave() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dungeon-mind-save-v1.0.0.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importSave(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      run({ type: "IMPORT_STATE", state: JSON.parse(reader.result) });
    } catch {
      run({ type: "IMPORT_PARSE_ERROR" });
    }
  };
  reader.readAsText(file);
}

function toggleDevTools() {
  const panel = document.getElementById("debug-panel");
  const button = document.getElementById("devToolsBtn");
  if (!panel || !button) return;

  panel.hidden = !panel.hidden;
  button.textContent = panel.hidden ? "Show Dev Tools" : "Hide Dev Tools";
  if (!panel.hidden) renderCouncilDebug(latestCouncilResult);
}

function wireEvents() {
  document.body.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    run({
      type: button.dataset.action,
      roomId: button.dataset.roomId,
      featureId: button.dataset.featureId,
      itemId: button.dataset.itemId,
    });
  });

  document.getElementById("saveBtn").addEventListener("click", () => run({ type: "SAVE" }));
  document.getElementById("loadBtn").addEventListener("click", () => run({ type: "LOAD" }));
  document.getElementById("exportBtn").addEventListener("click", exportSave);
  document.getElementById("importFile").addEventListener("change", importSave);
  document.getElementById("devToolsBtn").addEventListener("click", toggleDevTools);
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset the dungeon demo?")) run({ type: "RESET" });
  });
}

async function main() {
  try {
    await initialiseGame();
    wireEvents();
    render();
    renderCouncilDebug(null);
  } catch (error) {
    document.body.innerHTML = `<main class="card"><h2>Dungeon failed to load</h2><p>${error.message}</p><p>Tip: run this through GitHub Pages or a local web server rather than opening the file directly.</p></main>`;
  }
}

main();
