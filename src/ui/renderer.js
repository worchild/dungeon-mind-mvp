import { getState, getClueBook, APP_VERSION } from "../state/store.js";
import { currentRoom } from "../engine/rules.js";
import { validateState } from "../validation/validator.js";

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}

function getRoomName(roomId) {
  const state = getState();
  return state.rooms?.[roomId]?.name || roomId;
}

function clueDetails(clueId) {
  const clue = getClueBook()[clueId];
  if (!clue) return { id: clueId, title: clueId, text: clueId, importance: "unknown", pointsTo: [], tags: [] };
  if (typeof clue === "string") return { id: clueId, title: clueId, text: clue, importance: "lead", pointsTo: [], tags: [] };

  return {
    id: clueId,
    title: clue.title || clueId,
    text: clue.text || clueId,
    importance: clue.importance || "lead",
    foundIn: clue.foundIn,
    pointsTo: clue.pointsTo || [],
    tags: clue.tags || [],
    hint: clue.hint || "",
  };
}

function renderArt(room) {
  const title = escapeHtml(room.name);
  const labels = room.playerVisible.features
    .map(
      (feature, index) =>
        `<text x="${12 + (index % 2) * 48}%" y="${78 + Math.floor(index / 2) * 9}%" fill="#d8c690" font-size="10" text-anchor="middle">${escapeHtml(feature)}</text>`,
    )
    .join("");

  const motifs = {
    stairs:
      '<path d="M100 210 L520 210 L470 170 L150 170 Z M170 165 L450 165 L410 132 L210 132 Z M225 127 L395 127 L365 100 L255 100 Z" fill="#293246" stroke="#7d879c"/><path d="M305 30 L330 88 L280 88 Z" fill="#d8a84f" opacity=".75"/>',
    statues:
      '<rect x="70" y="70" width="90" height="145" rx="8" fill="#31384a" stroke="#8a91a3"/><rect x="470" y="70" width="90" height="145" rx="8" fill="#31384a" stroke="#8a91a3"/><circle cx="115" cy="105" r="26" fill="#566071"/><circle cx="515" cy="105" r="26" fill="#566071"/><path d="M240 150 H390" stroke="#d8a84f" stroke-width="6" opacity=".6"/>',
    water:
      '<path d="M0 170 Q80 145 160 170 T320 170 T480 170 T640 170 V260 H0 Z" fill="#1e5360" opacity=".8"/><rect x="410" y="80" width="120" height="70" fill="#3a2f28" stroke="#8b7960"/><circle cx="210" cy="164" r="22" fill="#cbd2cf" opacity=".55"/>',
    library:
      '<rect x="50" y="55" width="120" height="170" fill="#34271e" stroke="#8b6a42"/><rect x="470" y="55" width="120" height="170" fill="#34271e" stroke="#8b6a42"/><circle cx="320" cy="125" r="32" fill="#222" stroke="#d8a84f"/><path d="M320 95 V40" stroke="#777"/>',
    fountain:
      '<ellipse cx="320" cy="160" rx="150" ry="48" fill="#2c3448" stroke="#c5b37d"/><ellipse cx="320" cy="145" rx="95" ry="28" fill="#171b25" stroke="#d8a84f"/><path d="M300 65 h40 v70 h-40z" fill="#876b2f"/>',
    chapel:
      '<path d="M320 35 L390 125 H250 Z" fill="#473a25" stroke="#d8a84f"/><circle cx="320" cy="108" r="38" fill="#282d3d" stroke="#d8a84f"/><circle cx="320" cy="108" r="13" fill="#050608"/><rect x="235" y="175" width="170" height="38" fill="#3d3030"/>',
    cells:
      '<rect x="70" y="70" width="140" height="140" fill="#242b38" stroke="#858c9b"/><rect x="250" y="85" width="140" height="125" fill="#242b38" stroke="#858c9b"/><rect x="430" y="65" width="140" height="145" fill="#242b38" stroke="#858c9b"/><path d="M120 40 L520 95" stroke="#666" stroke-width="8"/>',
    mirror:
      '<rect x="245" y="42" width="150" height="185" rx="70" fill="#05070c" stroke="#b9c1d0" stroke-width="4"/><path d="M275 80 Q335 120 285 185" stroke="#5d748d" fill="none"/><circle cx="150" cy="90" r="9" fill="#d8a84f"/><circle cx="150" cy="140" r="9" fill="#d8a84f"/><circle cx="150" cy="190" r="9" fill="#d8a84f"/>',
    bridge:
      '<path d="M80 175 C210 115 420 115 560 175" fill="none" stroke="#8b8172" stroke-width="28"/><rect x="0" y="185" width="640" height="75" fill="#05060a"/><rect x="470" y="55" width="95" height="130" fill="#4f3921" stroke="#c5963e"/>',
    reliquary:
      '<circle cx="320" cy="130" r="92" fill="#4f3d1e" stroke="#d8a84f" opacity=".7"/><rect x="265" y="70" width="110" height="140" rx="50" fill="#dceaff" opacity=".24" stroke="#ffffff"/><path d="M320 95 L345 135 L320 175 L295 135 Z" fill="#ffd76a"/><path d="M255 110 H385 M255 140 H385 M255 170 H385" stroke="#b17a34" stroke-width="6"/>',
  };

  return `<svg viewBox="0 0 640 260" role="img" aria-label="Simple player-safe room image for ${title}">
    <defs><radialGradient id="g" cx="50%" cy="25%"><stop offset="0%" stop-color="#34405a"/><stop offset="100%" stop-color="#10131c"/></radialGradient></defs>
    <rect width="640" height="260" fill="url(#g)"/><text x="320" y="24" fill="#fff3d0" font-size="18" text-anchor="middle" font-weight="700">${title}</text>${motifs[room.imageType] || motifs.stairs}${labels}</svg>`;
}

function renderMap() {
  const state = getState();
  const grid = Array.from({ length: 25 }, () => `<div class="map-cell"></div>`);
  Object.values(state.rooms).forEach((room) => {
    const [x, y] = room.map;
    const index = y * 5 + x;
    const seen = state.player.visitedRooms.includes(room.id);
    grid[index] =
      `<div class="map-cell ${seen ? "visited" : ""} ${state.currentRoomId === room.id ? "current" : ""}">${seen ? `${room.id}<br>${escapeHtml(room.name.split(" ")[0])}` : "?"}</div>`;
  });
  document.getElementById("map").innerHTML = grid.join("");
}

function renderClueJournal() {
  const state = getState();
  const required = new Set(state.objective.requiredClueIds || []);
  const clues = state.player.clues || [];
  const insights = state.player.insights || [];

  if (!clues.length) {
    return `<p class="small">No clues discovered. Search suspicious features to start the treasure trail.</p>`;
  }

  const clueCards = clues
    .map((id) => {
      const clue = clueDetails(id);
      const leadText = clue.pointsTo?.length
        ? clue.pointsTo.map(getRoomName).join(" → ")
        : "No onward lead";
      const tags = clue.tags?.length
        ? clue.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")
        : "";

      return `<li class="clue-card ${required.has(id) ? "required" : ""}">
        <div class="clue-head">
          <strong>${escapeHtml(clue.title)}</strong>
          <span class="pill">${escapeHtml(clue.importance)}${required.has(id) ? " · core sign" : ""}</span>
        </div>
        <p>${escapeHtml(clue.text)}</p>
        ${clue.hint ? `<p class="small"><strong>Lead:</strong> ${escapeHtml(clue.hint)}</p>` : ""}
        <p class="small"><strong>Points toward:</strong> ${escapeHtml(leadText)}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
      </li>`;
    })
    .join("");

  const insightCards = insights.length
    ? `<h4>Insights</h4>${insights.map(insight => `<p class="insight">${escapeHtml(insight.text)}</p>`).join("")}`
    : `<p class="small">No clue connections made yet.</p>`;

  return `<ul class="clue-journal">${clueCards}</ul>${insightCards}`;
}

export function render() {
  const state = getState();
  const room = currentRoom();
  const lootActionLabel = room.finale ? "Recover Dawn Key" : "Collect Loot";

  document.getElementById("roomPanel").innerHTML = `
    <div class="room-title"><div><h2>${escapeHtml(room.name)}</h2><span class="pill">Room ${room.id}${room.finale ? " · Finale" : ""}</span></div><span class="pill">v${APP_VERSION} · Schema ${state.schemaVersion}</span></div>
    <div class="room-art">${renderArt(room)}</div>
    <p class="desc">${escapeHtml(room.playerVisible.description)}</p>
    <h3>Features</h3><ul>${room.playerVisible.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    ${room.monster && !room.monster.defeated ? `<p class="desc"><strong>${escapeHtml(room.monster.name)}:</strong> ${escapeHtml(room.monster.playerText)}</p>` : ""}
    <div class="exits">${room.exits.map((exit) => `<button class="primary" data-action="MOVE" data-room-id="${exit.to}">Go ${escapeHtml(exit.dir)}</button>`).join("")}</div>
    <div class="actions">
      <button data-action="SEARCH" ${room.search?.done ? "disabled" : ""}>Search for Clues</button>
      <button class="good" data-action="LOOT" ${!room.loot?.length || state.player.lootedRooms.includes(room.id) ? "disabled" : ""}>${lootActionLabel}</button>
      <button class="danger" data-action="DEFEAT_MONSTER" ${!room.monster || room.monster.defeated ? "disabled" : ""}>Defeat Monster</button>
    </div>`;

  document.getElementById("objective").innerHTML =
    `<strong>${escapeHtml(state.objective.title)}</strong><p class="small">${escapeHtml(state.objective.playerText)}</p><p class="${state.objective.complete ? "status-ok" : ""}">${state.objective.complete ? "Complete" : "In progress"}</p>`;
  document.getElementById("threatFill").style.width =
    `${(state.threat.value / state.threat.max) * 100}%`;
  document.getElementById("threatText").textContent =
    `${state.threat.value} / ${state.threat.max}${state.threat.value >= 8 ? " — the dungeon is very awake" : ""}`;
  document.getElementById("inventory").innerHTML = state.player.inventory.length
    ? state.player.inventory
        .map(
          (i) =>
            `<li><strong>${escapeHtml(i.name)}</strong><br><span class="small">${escapeHtml(i.text)}</span></li>`,
        )
        .join("")
    : `<li class="small">Nothing yet.</li>`;
  document.getElementById("clues").innerHTML = renderClueJournal();
  document.getElementById("log").innerHTML = state.log
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("");
  renderMap();

  const errors = validateState(state);
  document.getElementById("validatorStatus").innerHTML = errors.length
    ? `<span class="status-bad">Validator: ${escapeHtml(errors.join(" "))}</span>`
    : `<span class="status-ok">Validator: state OK</span>`;
}

export function renderCouncilDebug(councilResult) {
  const debugPanel = document.getElementById("debug-panel");
  const debugOutput = document.getElementById("council-debug-output");

  if (!debugPanel || !debugOutput) return;

  debugPanel.hidden = false;
  debugOutput.textContent = councilResult
    ? JSON.stringify(councilResult, null, 2)
    : "Internal reasoning is enabled. Take an action to generate the first Director decision and queued intent.";
}
