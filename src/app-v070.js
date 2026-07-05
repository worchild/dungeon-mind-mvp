import { initialiseGame, dispatch } from "./engine/rules.js?v=0.8.2";
import { getState } from "./state/store.js?v=0.8.2";
import { render, renderCouncilDebug } from "./ui/renderer.js?v=0.8.2";

function run(action) {
  const result = dispatch(action);
  render();
  renderCouncilDebug(result?.councilResult);
}

function exportSave() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dungeon-mind-save-v0.8.2.json";
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
      const result = dispatch({ type: "UNKNOWN_IMPORT_ERROR" });
      render();
      renderCouncilDebug(result?.councilResult);
    }
  };
  reader.readAsText(file);
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
