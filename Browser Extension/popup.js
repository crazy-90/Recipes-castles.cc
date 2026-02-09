

document.addEventListener('DOMContentLoaded', async () => {
// keep popup tall while modal is visible
document.body.style.height = "400px";
document.documentElement.style.height = "400px";

const overlay = document.getElementById("startupOverlay");
const closeBtn = document.getElementById("startupClose");

if (overlay && closeBtn) {
  closeBtn.onclick = () => {
    overlay.remove();

    // restore normal popup height
    document.body.style.height = "250px";
    document.documentElement.style.height = "250px";
  };
}


  const ROW_HEIGHT = 36;
  const INITIAL_SEARCH_HEIGHT = 150;

  const resp = await fetch('recipes.json');
  const recipes = await resp.json();

  const searchInput = document.getElementById('search');
  const results = document.getElementById('results');
  const searchContainer = document.getElementById('searchContainer');
  const viewer = document.getElementById('viewer');
  const frame = document.getElementById('recipeFrame');
  const backBtn = document.getElementById('backBtn');
  const viewerBtns = document.getElementById('viewerBtns');
  const themeBtn = document.getElementById('themeBtn');
  const favListBtn = document.getElementById('favListBtn');
  const recentBtn = document.getElementById('recentBtn');
  const toggleBtn = document.getElementById('toggleBtn'); // ✅ Toggle link button
const startupContent = document.getElementById("startupContent");

if (startupContent) {
  startupContent.style.maxHeight = "320px";   // fits inside your 400px popup
  startupContent.style.overflowY = "scroll"; // 👈 ALWAYS show scrollbar
  startupContent.style.paddingRight = "6px";
  startupContent.style.boxSizing = "border-box";
}
let latest = [];

// =============================
// WHAT'S NEW (COMMUNITY PRICES)
// =============================
const WHATS_NEW_URL = "https://cc.bladingbasics.com/data/whats_new.json";
const WHATS_NEW_SEEN_KEY = "whats_new_seen_ids";

async function checkWhatsNew() {
  let updates;

  try {
    const res = await fetch(WHATS_NEW_URL, { cache: "no-store" });
    updates = await res.json();
  } catch (e) {
    console.warn("Failed to fetch whats_new.json", e);
    return;
  }

  if (!Array.isArray(updates) || updates.length === 0) return;

  // load seen IDs
  const stored = await chrome.storage.local.get(WHATS_NEW_SEEN_KEY);
  const seen = Array.isArray(stored[WHATS_NEW_SEEN_KEY])
    ? stored[WHATS_NEW_SEEN_KEY]
    : [];

  // 🔥 collect ALL unseen entries (not just first)
  const unseen = updates.filter(u => u.id && !seen.includes(u.id));

  if (unseen.length === 0) return;

  const overlay = document.getElementById("startupOverlay");
  const content = document.getElementById("startupContent");
  const closeBtn = document.getElementById("startupClose");

  if (!overlay || !content || !closeBtn) return;

  content.innerHTML = "";

  // 🔥 render ALL unseen entries
  unseen.forEach(update => {
    const block = document.createElement("div");
    block.style.marginBottom = "10px";
    block.style.paddingBottom = "8px";
    block.style.borderBottom = "1px solid rgba(0,0,0,0.15)";

    block.innerHTML = `
      <strong>${update.title || "Price Updated"}</strong><br>
      <small>${update.timestamp
        ? new Date(update.timestamp).toLocaleString()
        : ""}</small>
    `;

    if (Array.isArray(update.items)) {
      update.items.forEach(item => {
        const row = document.createElement("div");
        row.style.marginLeft = "6px";
        row.innerHTML = `
          ${item.name}: ${item.min.toLocaleString()} – ${item.max.toLocaleString()}
        `;
        block.appendChild(row);
      });
    }

    content.appendChild(block);
  });

  overlay.style.display = "flex";

  // ✅ mark ALL SHOWN entries as seen
  closeBtn.onclick = async () => {
    const newSeen = [...new Set([...seen, ...unseen.map(u => u.id)])];
    await chrome.storage.local.set({ [WHATS_NEW_SEEN_KEY]: newSeen });
    overlay.style.display = "none";
  };
}




  // ==============================
// STATUS -> CLASS (robust)
// ==============================
function getStatusClass(status) {
  if (!status || typeof status !== "string") return "";

  const s = status.toLowerCase().trim();

  if (["increasing", "increase", "rising", "up", "upward"].includes(s)) {
    return "price-increasing";
  }

  if (["decreasing", "decrease", "dropping", "down", "downward"].includes(s)) {
    return "price-decreasing";
  }

  if (["unstable", "volatile"].includes(s)) {
    return "price-unstable";
  }

  return "";
}


function applyStatusStyle(el, status) {
  if (!status) return;

  const s = String(status).toLowerCase().trim();

  if (["increasing", "increase", "rising", "up", "upward"].includes(s)) {
    el.style.color = "#4caf50"; // green
    el.style.fontWeight = "bold";
  }

  else if (["decreasing", "decrease", "dropping", "down", "downward"].includes(s)) {
    el.style.color = "#e53935"; // red
    el.style.fontWeight = "bold";
  }

  else if (["unstable", "volatile"].includes(s)) {
    el.style.color = "#fbc02d"; // yellow
    el.style.fontWeight = "bold";
  }
}

function formatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const lastThree = history.slice(-3).reverse();

  return `
    <div style="margin-top:8px; font-size:12px; text-align:left;">
      <strong>Recent updates:</strong>
      <ul style="margin:4px 0 0 14px; padding:0;">
        ${lastThree.map(h => `
          <li>
            ${h.min.toLocaleString()} – ${h.max.toLocaleString()}
            ${h.timestamp ? ` <span style="opacity:0.7">(${new Date(h.timestamp).toLocaleDateString()})</span>` : ""}
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}


function renderHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const lastThree = history.slice(-3).reverse();

  return `
    <div style="
      margin-top:8px;
      font-size:12px;
      text-align:left;
    ">
      <strong>Recent updates:</strong>
      <ul style="margin:4px 0 0 14px; padding:0;">
        ${lastThree.map(h => `
          <li>
            ${h.min.toLocaleString()} – ${h.max.toLocaleString()}
            ${h.timestamp
              ? `<span style="opacity:0.7">
                   (${new Date(h.timestamp).toLocaleDateString()})
                 </span>`
              : ""}
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}




/* =======================
   PRICE TRACKER — ROW LOCK + PENCIL + AUTO BLANK ROW + SAVE + SELECT
   ======================= */
(() => {
  // --- Main Overlay ---
  const priceTrackerOverlay = document.createElement("div");
  priceTrackerOverlay.id = "priceTrackerOverlay";
  priceTrackerOverlay.style = `
    display:none;
    flex-direction:column;
    align-items:flex-start;
    padding:10px;
    background:var(--panel);
    overflow-y:auto;
    border-top:1px solid rgba(0,0,0,0.1);
    width:95%;
    height:450px;
  `;
  document.body.appendChild(priceTrackerOverlay);

  // Top Control Row
  const controlRow = document.createElement("div");
  controlRow.style = "display:flex; gap:6px; margin-bottom:10px; width:100%;";
  priceTrackerOverlay.appendChild(controlRow);

  // Back Button
  const ptBackBtn = document.createElement("button");
  ptBackBtn.textContent = "⬅️ Back";
  ptBackBtn.style = `
    flex:1;
    background:#4a90e2;
    color:#fff;
    font-weight:bold;
    padding:4px 6px;
    border:none;
    border-radius:6px;
    cursor:pointer;
  `;
  controlRow.appendChild(ptBackBtn);

  // Save Button
  const ptSave = document.createElement("button");
  ptSave.textContent = "Save";
  ptSave.style = `
    flex:1;
    background:#4a90e2;
    color:#fff;
    font-weight:bold;
    padding:4px 6px;
    border:none;
    border-radius:6px;
    cursor:pointer;
  `;
  controlRow.appendChild(ptSave);

  // Clear Button
  const ptClear = document.createElement("button");
  ptClear.textContent = "Clear";
  ptClear.style = `
    flex:1;
    background:#e24a4a;
    color:#fff;
    font-weight:bold;
    padding:4px 6px;
    border:none;
    border-radius:6px;
    cursor:pointer;
    display: none;
    user-select: none;
  `;
  controlRow.appendChild(ptClear);

  // Remove Selected Button (NEW)
  const ptRemoveSelected = document.createElement("button");
  ptRemoveSelected.textContent = "Remove Selected";
  ptRemoveSelected.style = `
    flex:1;
    background:#ff9f00;
    color:#fff;
    font-weight:bold;
    padding:4px 6px;
    border:none;
    border-radius:6px;
    cursor:pointer;
  `;
  controlRow.appendChild(ptRemoveSelected);

  // Title
  const ptTitle = document.createElement("h3");
  ptTitle.textContent = "Price Tracker";
  ptTitle.style = "margin:0 0 10px 0;font-weight:bold;";
  priceTrackerOverlay.appendChild(ptTitle);

  // Total profit display
  const totalRow = document.createElement("div");
  totalRow.style = "width:100%; display:flex; justify-content:flex-end; align-items:center; margin-bottom:6px; font-weight:bold;";
  const totalLabel = document.createElement("div");
  totalLabel.textContent = "Total: ";
  totalLabel.style = "margin-right:8px;";
  const totalValue = document.createElement("div");
  totalValue.textContent = "";
  totalRow.append(totalLabel, totalValue);
  priceTrackerOverlay.appendChild(totalRow);

  // Row container for main overlay
  const rowContainer = document.createElement("div");
  rowContainer.style = "display:flex; flex-direction:column; gap:6px; width:100%;";
  priceTrackerOverlay.appendChild(rowContainer);

  const STORAGE_KEY = "priceTrackerRows";

  // ---------- helpers ----------
function parseNumber(val) {
  if (val === null || val === undefined) return 0;
  return Number(String(val).replace(/,/g, "").trim()) || 0;
}

function profitText(boughtStr, soldStr) {
  const b = parseNumber(boughtStr);
  const s = parseNumber(soldStr);

  const bHasValue = String(boughtStr).trim() !== "";
  const sHasValue = String(soldStr).trim() !== "";

  // Nothing entered yet
  if (!bHasValue && !sHasValue) return "";

  // Don't show profit until sold exists
  if (!sHasValue) return "";

  const profit = s - (bHasValue ? b : 0);

  return `Profit: ${profit > 0 ? "+" : ""}${profit.toLocaleString()}`;
}




  function recomputeTotal(container = rowContainer) {
    const rows = [...container.children];
    let total = 0;
    rows.forEach(r => {
      const inputs = r.querySelectorAll("input");
      if (!inputs || inputs.length < 3) return;
      const bStr = inputs[1].value.trim();
      const sStr = inputs[2].value.trim();
      if (sStr === "" || Number(sStr) === 0) return;
      const b = parseNumber(bStr);
	  const s = parseNumber(sStr);
	  total += (s - b);

    });
    totalValue.textContent =
         total === 0 ? "" : `${total > 0 ? "+" : ""}${total.toLocaleString()}`;

  }

  // ---------- row creation ----------
  function lockRow(row) {
    const inputs = row.querySelectorAll("input");
    const display = document.createElement("div");
    display.className = "locked-display";
    display.style = `
      padding:2px 4px;
      background:#00000015;
      border-radius:4px;
      font-weight:bold;
      white-space:nowrap;
    `;
    const item = inputs[0].value.trim();
    const bought = inputs[1].value.trim();
    const sold = inputs[2].value.trim();
    let text = item;
    if (bought) text += ` | Bought: ${bought}`;
    if (sold) text += ` | Sold: ${sold}`;
    display.textContent = text;
    inputs.forEach(i => { i.style.display = "none"; i.readOnly = true; });
    const old = row.querySelector(".locked-display");
    if (old) old.remove();
    row.appendChild(display);
    const pencil = row.querySelector(".row-edit-btn");
    if (pencil) pencil.style.display = "inline-block";
    row.dataset.locked = "true";
  }

  function unlockRow(row) {
    const inputs = row.querySelectorAll("input");
    inputs.forEach(i => { i.style.display = "block"; i.readOnly = false; });
    const display = row.querySelector(".locked-display");
    if (display) display.remove();
    const pencil = row.querySelector(".row-edit-btn");
    if (pencil) pencil.style.display = "none";
    row.dataset.locked = "false";
    const first = inputs[0];
    if (first) first.focus();
  }

  function createRow(item = "", bought = "", sold = "", container = rowContainer) {
    const row = document.createElement("section");
    row.style = `
      display:flex;
      flex-direction:column;
      gap:2px;
      width:100%;
      padding:2px 4px;
      border-radius:4px;
      border:1px solid #4a90e2;
      background:#ffffff10;
      font-size:12px;
    `;
    row.classList.add("price-row");
	// Auto-save on Enter for all inputs in the price tracker
document.querySelector('#priceTrackerOverlay').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault();   // prevent default Enter behavior
    window._priceTracker.save(); // auto-save using your existing save function
  }
});


    // inputs row
    const inputsRow = document.createElement("div");
    inputsRow.style = "display:flex; gap:4px; width:100%; align-items:center;";
    const itemInput = document.createElement("input");
    itemInput.placeholder = "Item";
    itemInput.value = item;
    itemInput.style = "flex:2; padding:2px; min-width:40px; font-size:12px;";
    const boughtInput = document.createElement("input");
    boughtInput.placeholder = "Bought";
    boughtInput.value = bought;
    boughtInput.type = "text";
    boughtInput.style = "flex:1; padding:2px; min-width:40px; font-size:12px;";
    const soldInput = document.createElement("input");
    soldInput.placeholder = "Sold";
    soldInput.value = sold;
    soldInput.type = "text";
    soldInput.style = "flex:1; padding:2px; min-width:40px; font-size:12px;";
    inputsRow.append(itemInput, boughtInput, soldInput);

    // profit + pencil
    const profitContainer = document.createElement("div");
    profitContainer.style = "display:flex; align-items:center; gap:4px; color:green; font-weight:bold; justify-content:flex-end; width:100%;";
    const profitDisplay = document.createElement("p");
    profitDisplay.style = "margin:0; white-space:nowrap;";
    profitDisplay.textContent = profitText(bought, sold);
    const pencilBtn = document.createElement("button");
    pencilBtn.className = "row-edit-btn";
    pencilBtn.title = "Edit row";
    pencilBtn.textContent = "✏️";
    pencilBtn.style = "display:none; background:transparent; border:none; cursor:pointer; padding:1px; font-size:12px;";
    pencilBtn.addEventListener("click", e => { e.stopPropagation(); unlockRow(row); });
    profitContainer.append(profitDisplay, pencilBtn);

    row.append(inputsRow, profitContainer);
    container.appendChild(row);

    // row selection
    row.addEventListener("click", e => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
      row.classList.toggle("selected-row");
    });

    // update profit & trailing blank
    function updateAll() {
      profitDisplay.textContent = profitText(boughtInput.value, soldInput.value);
      recomputeTotal();
      if (container === rowContainer) ensureTrailingBlank(container);
    }

    function handleEnterLock(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        lockRow(row);
        if (container === rowContainer) ensureTrailingBlank(container);
      }
    }

    [itemInput, boughtInput, soldInput].forEach(inp => {
      inp.addEventListener("input", updateAll);
      inp.addEventListener("keydown", handleEnterLock);
    });

    // auto-lock if has initial data
    if ([item, bought, sold].some(v => v.trim() !== "")) lockRow(row);

    return row;
  }

  function ensureTrailingBlank(container) {
    const rows = [...container.children];
    const last = rows[rows.length - 1];
    if (!last) { createRow("", "", "", container); return; }
    const inputs = last.querySelectorAll("input");
    const allEmpty = [...inputs].every(i => i.value.trim() === "");
    if (!allEmpty) createRow("", "", "", container);
  }

function saveRows() {
  const rows = [...rowContainer.children];
  const data = rows.map(r => {
    const inputs = [...r.querySelectorAll("input")];
    return {
      item: inputs[0].value,
      bought: inputs[1].value,
      sold: inputs[2].value
    };
  }).filter(r => r.item || r.bought || r.sold);

  chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
    ptSave.textContent = "Saved ✓";
    setTimeout(() => (ptSave.textContent = "Save"), 900);
  });
}



function loadRows() {
  chrome.storage.local.get([STORAGE_KEY], result => {
    const data = result[STORAGE_KEY] || [];

    rowContainer.innerHTML = "";

    data.forEach(d =>
      createRow(d.item, d.bought, d.sold, rowContainer)
    );

    ensureTrailingBlank(rowContainer);
    recomputeTotal();
  });
}



function clearAll() {
  chrome.storage.local.remove(STORAGE_KEY, () => {
    rowContainer.innerHTML = "";
    createRow("", "", "", rowContainer);
    recomputeTotal();
  });
}



// Remove selected rows and auto-save
ptRemoveSelected.addEventListener("click", () => {
  const rows = [...rowContainer.children];
  rows.forEach(r => {
    if (r.classList.contains("selected-row")) r.remove();
  });
  recomputeTotal();
  window._priceTracker.save(); // auto-save after removal
});


  ptBackBtn.addEventListener("click", () => {
    priceTrackerOverlay.style.display = "none";
    ptBackBtn.style.display = "none";
    const trackerBtn = document.querySelector('button[data-pt-tracker="true"]');
    if (trackerBtn) trackerBtn.style.display = "block";
    const searchContainerEl = document.getElementById("searchContainer");
    if (searchContainerEl) searchContainerEl.style.display = "flex";
  });

  ptSave.addEventListener("click", saveRows);
  ptClear.addEventListener("click", () => { if(confirm("Clear all?")) clearAll(); });

  const trackerBtn = document.createElement("button");
  trackerBtn.textContent = "Price Tracker";
  trackerBtn.dataset.ptTracker = "true";
  trackerBtn.style = `
    background:#4a90e2;color:#fff;font-weight:bold;
    padding:8px 16px;border:none;border-radius:8px;
    cursor:pointer;width:90%;margin:10px auto;display:block;
  `;
  const searchContainer = document.getElementById("searchContainer");
  if(searchContainer) searchContainer.appendChild(trackerBtn); else document.body.appendChild(trackerBtn);

  trackerBtn.addEventListener("click", () => {
    priceTrackerOverlay.style.display = "flex";
    ptBackBtn.style.display = "inline-block";
    trackerBtn.style.display = "none";
    if(searchContainer) searchContainer.style.display = "none";
    loadRows();
  });

  priceTrackerOverlay.style.display = "none";
  ptBackBtn.style.display = "none";

  // selection CSS
  const style = document.createElement("style");
  style.textContent = `
    .selected-row { border-color:#00d9ff !important; background:#00d9ff20 !important; }
  `;
  document.head.appendChild(style);

  // expose API
  window._priceTracker = { save: saveRows, load: loadRows, clear: clearAll, createRow: createRow };
})();







  
// === Prices Overlays for Community and Dejavu ===
const createPricesOverlay = (id, jsonFile, buttonText) => {
  // Overlay container
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.style = `
    display:none;
    flex-direction:column;
    align-items:flex-start;
    padding:10px;
    background:var(--panel);
    overflow-y:auto;
    border-top:1px solid rgba(0,0,0,0.1);
    width:100%;
    height:450px;
  `;
  document.body.appendChild(overlay);

  // Back button
  const backBtn = document.createElement('button');
  backBtn.textContent = '⬅️ Back';
  backBtn.style = `
    display:none;
    margin-bottom:10px;
    background:#4a90e2;
    color:#fff;
    font-weight:bold;
    padding:6px 12px;
    border:none;
    border-radius:8px;
    cursor:pointer;
  `;
  overlay.appendChild(backBtn);

  // =============================
  //   INLINE "WHAT'S NEW" BUTTON
  // =============================

  const topRow = document.createElement("div");
  topRow.style = `
    width:100%;
    display:flex;
    gap:6px;
    margin-bottom:10px;
  `;
  overlay.appendChild(topRow);

  backBtn.style.marginBottom = "0";
  topRow.appendChild(backBtn);

  const whatsNewBtn = document.createElement("button");
  whatsNewBtn.textContent = "What's New";
  whatsNewBtn.style = `
    background:#e0a800;
    color:#fff;
    font-weight:bold;
    padding:6px 12px;
    border:none;
    border-radius:8px;
    cursor:pointer;
  `;
  topRow.appendChild(whatsNewBtn);

  const whatsNewOverlay = document.createElement("div");
  whatsNewOverlay.style = `
    display:none;
    flex-direction:column;
    padding:10px;
    background:var(--panel);
    width:100%;
    height:450px;
    overflow-y:scroll;
    border-top:1px solid rgba(0,0,0,0.1);
  `;
  overlay.appendChild(whatsNewOverlay);

  const whatsNewBack = document.createElement("button");
  whatsNewBack.textContent = "⬅️ Back";
  whatsNewBack.style = `
    background:#4a90e2;
    color:#fff;
    font-weight:bold;
    padding:6px 12px;
    font-size:12px;
    border:none;
    border-radius:8px;
    cursor:pointer;
    margin-bottom:10px;
    width:fit-content;
    white-space:nowrap;
  `;
  whatsNewOverlay.appendChild(whatsNewBack);

  const whatsNewContent = document.createElement("div");
  whatsNewOverlay.appendChild(whatsNewContent);

  // ===============================
  // 🔥 WHAT'S NEW — JSON ONLY
  // ===============================
async function loadWhatsNew() {
  whatsNewContent.innerHTML = "Loading…";

  try {
    const res = await fetch(
      "https://cc.bladingbasics.com/data/whats_new.json",
      { cache: "no-store" }
    );

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      whatsNewContent.textContent = "No recent updates.";
      return;
    }

    whatsNewContent.innerHTML = "";

    // ✅ LOOP ALL ENTRIES (NEWEST FIRST)
    data.forEach(entry => {
      const block = document.createElement("div");
      block.style.marginBottom = "12px";
      block.style.paddingBottom = "8px";
      block.style.borderBottom = "1px solid rgba(0,0,0,0.15)";

      block.innerHTML = `
        <strong>${entry.title || "Price Updated"}</strong><br>
        <small>${new Date(entry.timestamp).toLocaleString()}</small>
      `;

      if (Array.isArray(entry.items)) {
        entry.items.forEach(item => {
          const row = document.createElement("div");
          row.style.marginLeft = "6px";
          row.style.fontSize = "13px";
          row.innerHTML = `
            ${item.name}: ${item.min.toLocaleString()} – ${item.max.toLocaleString()}
          `;
          block.appendChild(row);
        });
      }

      whatsNewContent.appendChild(block);
    });

  } catch (err) {
    console.warn("Failed to load whats_new.json", err);
    whatsNewContent.textContent = "Unable to load updates.";
  }
}


  whatsNewBtn.addEventListener("click", async () => {
    await loadWhatsNew();
    whatsNewOverlay.style.display = "flex";
    backBtn.style.display = "none";
    searchInput.style.display = "none";
    results.style.display = "none";
    whatsNewBtn.style.display = "none";
  });

  whatsNewBack.addEventListener("click", () => {
    whatsNewOverlay.style.display = "none";
    backBtn.style.display = "inline-block";
    searchInput.style.display = "block";
    results.style.display = "block";
    whatsNewBtn.style.display = "inline-block";
  });
  
  // 🚨 Report Price Button (Community Only)
let reportPriceBtn = null;

if (buttonText === "Community Prices") {
  reportPriceBtn = document.createElement("button");
  reportPriceBtn.textContent = "🚨 Report Price";
  reportPriceBtn.style = `
    background:#c0392b;
    color:#fff;
    font-weight:bold;
    padding:6px 12px;
    border:none;
    border-radius:8px;
    cursor:pointer;
  `;
  topRow.appendChild(reportPriceBtn);
}

// ==============================
// 🚨 REPORT PRICE OVERLAY
// ==============================
const reportOverlay = document.createElement("div");
reportOverlay.style = `
  display:none;
  flex-direction:column;
  padding:10px;
  background:var(--panel);
  width:100%;
  height:450px;
  overflow-y:auto;
`;

overlay.appendChild(reportOverlay);

// Back button
const reportBackBtn = document.createElement("button");
reportBackBtn.textContent = "⬅ Back";
reportBackBtn.style = `
  background:#4a90e2;
  color:#fff;
  font-weight:bold;
  padding:6px 12px;
  border:none;
  border-radius:8px;
  cursor:pointer;
  width:fit-content;
  margin-bottom:10px;
`;
reportOverlay.appendChild(reportBackBtn);



// Title
const reportTitle = document.createElement("h3");
reportTitle.textContent = "🚨 Report Wrong Price";
reportOverlay.appendChild(reportTitle);

// ==============================
// SMART ITEM SELECTOR
// ==============================
const reportItemInput = document.createElement("input");
reportItemInput.placeholder = "Search item...";
reportItemInput.style = "margin-bottom:6px;padding:6px;font-weight:bold;";
reportOverlay.appendChild(reportItemInput);

const reportItemList = document.createElement("ul");
reportItemList.style = `
  list-style:none;
  padding:0;
  margin:0 0 8px 0;
  max-height:140px;
  overflow-y:auto;
  border:1px solid rgba(0,0,0,0.2);
  display:none;
`;
reportOverlay.appendChild(reportItemList);

let selectedReportItem = null;

// Build item list from loaded price data
function buildReportItemList(query = "") {
  reportItemList.innerHTML = "";
  const q = query.toLowerCase();

  const matches = data
    .map(d => d.words?.[0]?.split(":")[0])
    .filter(Boolean)
    .filter(name => name.toLowerCase().includes(q))
    .slice(0, 25);

  if (!matches.length) {
    reportItemList.style.display = "none";
    return;
  }

  matches.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    li.style = `
      padding:6px;
      cursor:pointer;
      background:var(--row);
      border-bottom:1px solid rgba(0,0,0,0.05);
    `;

    li.addEventListener("click", () => {
      selectedReportItem = name;
      reportItemInput.value = name;
      reportItemList.style.display = "none";
    });

    reportItemList.appendChild(li);
  });

  reportItemList.style.display = "block";
}

reportItemInput.addEventListener("input", e => {
  selectedReportItem = null;
  buildReportItemList(e.target.value);
});


// Reason input
const reportReason = document.createElement("textarea");
reportReason.placeholder = "What is wrong with the price?";
reportReason.style = "min-height:80px;padding:6px;";
reportOverlay.appendChild(reportReason);

// Submit button
const reportSubmit = document.createElement("button");
reportSubmit.textContent = "Submit Report";
reportSubmit.style = `
  margin-top:10px;
  background:#c0392b;
  color:#fff;
  font-weight:bold;
  padding:8px;
  border:none;
  border-radius:8px;
  cursor:pointer;
`;
reportOverlay.appendChild(reportSubmit);

// Open report overlay
reportPriceBtn?.addEventListener("click", () => {
  searchInput.style.display = "none";
  results.style.display = "none";
  whatsNewBtn.style.display = "none";
  reportPriceBtn.style.display = "none";
  backBtn.style.display = "none";

  reportOverlay.style.display = "flex";
});

// Back to Community Prices
reportBackBtn.addEventListener("click", () => {
  reportOverlay.style.display = "none";

  searchInput.style.display = "block";
  results.style.display = "block";
  whatsNewBtn.style.display = "inline-block";
  reportPriceBtn.style.display = "inline-block";
  backBtn.style.display = "inline-block";
});


reportSubmit.addEventListener("click", async () => {
  if (!selectedReportItem) {
    alert("Please select a valid item from the list");
    return;
  }

  const message =
    `🚨 Community Price Report\n` +
    `Item: ${selectedReportItem}\n` +
    `Issue: ${reportReason.value || "No details provided"}`;
  try {
    const res = await fetch("https://report.bladingbasics.com/report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    item: selectedReportItem,
    type: "price_report",
    source: "extension",
    issue: reportReason.value || "No details provided"
  })
});
    if (!res.ok) {
      alert("Report blocked or failed");
      return;
    }

    alert("Report sent!");
  } catch (err) {
    console.error("Report failed", err);
    alert("Failed to send report");
  }

  reportItemInput.value = "";
  reportReason.value = "";
  selectedReportItem = null;
});





  // Search input
  const searchInput = document.createElement('input');
  searchInput.placeholder = `Search ${buttonText}...`;
  searchInput.style =
    'padding:6px 8px;width:95%;margin-bottom:8px;border:2px solid var(--muted);border-radius:6px;font-weight:bold;';
  overlay.appendChild(searchInput);

  // Results list
  const results = document.createElement('ul');
  results.style = 'list-style:none;padding:0;margin:0;width:100%;';
  overlay.appendChild(results);

  // ===============================
  // 🔥 REMOTE JSON OVERRIDE (UNCHANGED)
  // ===============================
  if (typeof jsonFile === "string") {
    const lower = jsonFile.toLowerCase();

    if (lower.includes("community")) {
      jsonFile = "https://cc.bladingbasics.com/data/community_prices.json";
    } else if (lower.includes("dejavu")) {
      jsonFile = "https://cc.bladingbasics.com/data/dejavu_prices.json";
    }

    jsonFile += (jsonFile.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  // Load JSON data
  let data = [];
  fetch(jsonFile).then(r => r.json()).then(d => { data = d; renderResults(); });

  function imageExists(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

// ==============================
// PRICE STATUS → CSS CLASS
// ==============================
function getStatusClass(status) {
  if (!status || typeof status !== "string") return "";

  switch (status.toLowerCase()) {
    case "increasing":
      return "price-increasing";
    case "decreasing":
      return "price-decreasing";
    case "unstable":
      return "price-unstable";
    default:
      return "";
  }
}


const buildPriceItem = (item, query = "") => {
  const li = document.createElement("li");
  li.className = "resultItem";

  const itemText = Array.isArray(item.words)
    ? item.words.join(" | ")
    : String(item);

  const re = new RegExp(escapeRegExp(query), "ig");

  // ✅ status → class
  const statusClass = getStatusClass(item.status);

  const highlightedHTML = query
    ? itemText.replace(re, m => `<mark>${m}</mark>`)
    : itemText;
	
const span = document.createElement("span");
span.className = "priceText";
span.innerHTML = highlightedHTML;

// 🔥 APPLY COLOR DIRECTLY
applyStatusStyle(span, item.status);

li.appendChild(span);

  if (item.status) {
    li.title = `Status: ${item.status}`;
  }

  // ==============================
  // PREVIEW BOX (unchanged)
  // ==============================
  const preview = document.createElement("div");
  preview.className = "previewBox";
  preview.style = `
    display:none;
    margin-top:6px;
    padding:6px;
    background:var(--panel);
    border:1px solid rgba(0,0,0,0.1);
    border-radius:6px;
    text-align:center;
  `;
  li.appendChild(preview);

  function toServerCase(name) {
    return name
      .toLowerCase()
      .replace(/(^|_)([a-z])/g, (_, s, c) => s + c.toUpperCase());
  }

  async function resolveImageURL(encodedName) {
    const serverURL = `https://cc.bladingbasics.com/${toServerCase(encodedName)}.png`;
    if (await imageExists(serverURL)) return serverURL;

    const lowerURL = `https://cc.bladingbasics.com/${encodedName.toLowerCase()}.png`;
    if (await imageExists(lowerURL)) return lowerURL;

    return serverURL;
  }

  li.addEventListener("click", async (e) => {
    e.stopPropagation();

    if (preview.style.display === "block" && preview.dataset.zoom !== "on") {
      preview.style.display = "none";
      return;
    }

    document.querySelectorAll(".resultItem .previewBox").forEach(p => {
      if (p !== preview) p.style.display = "none";
    });

    const raw = Array.isArray(item.words) ? item.words[0] : String(item);

    let baseName = raw.split(":")[0].trim();
    baseName = baseName
      .replace(/[(),\/\-]/g, "")
      .replace(/\s+/g, "_")
      .trim();

    const encoded = baseName.replace(/'/g, "%27");
    const imgURL = await resolveImageURL(encoded);

preview.innerHTML = `
  <strong>${baseName.replace(/_/g, " ")}</strong><br>

  <img src="${imgURL}"
       data-zoom="off"
       onmousedown="event.stopPropagation()"
       onclick="
         event.stopPropagation();
         if (this.dataset.zoom === 'off') {
           this.dataset.zoom = 'on';
           this.style.maxWidth = '200px';
           this.style.maxHeight = '200px';
           this.style.cursor = 'zoom-out';
         } else {
           this.dataset.zoom = 'off';
           this.style.maxWidth = '150px';
           this.style.maxHeight = '150px';
           this.style.cursor = 'zoom-in';
         }
       "
       style="
         max-width:150px;
         max-height:150px;
         margin-top:6px;
         cursor:zoom-in;
         image-rendering:pixelated;
       ">

  ${renderHistory(item.history)}
`;


    preview.style.display = "block";
  });

  return li;
};





function priceItemMatches(item, q) {
  if (!q) return true;

  // Match words (existing behavior)
  const wordsMatch =
    Array.isArray(item.words) &&
    item.words.some(w => w.toLowerCase().includes(q));

  // Match category (NEW)
  const categoryMatch =
    typeof item.category === 'string' &&
    item.category.toLowerCase().includes(q);

  return wordsMatch || categoryMatch;
}


const renderResults = (query = '') => {
  results.innerHTML = '';
  const q = query.trim().toLowerCase();

  const filtered = data.filter(item => {
    // Match item words (existing behavior)
    const wordsMatch =
      Array.isArray(item.words) &&
      item.words.some(w => w.toLowerCase().includes(q));

    // Match category (NEW, searchable but not displayed)
    const categoryMatch =
      typeof item.category === 'string' &&
      item.category.toLowerCase().includes(q);

    return wordsMatch || categoryMatch;
  });

  if (!filtered.length) {
    results.innerHTML = '<li style="padding:8px;">No items found.</li>';
  } else {
    filtered.forEach(item =>
      results.appendChild(buildPriceItem(item, q))
    );
  }
};


  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = buttonText;
  toggleBtn.style =
    'background:#4a90e2;color:#fff;font-weight:bold;padding:8px 16px;border:none;border-radius:8px;cursor:pointer;width:90%;margin:10px auto;display:block;';
  document.getElementById('searchContainer').appendChild(toggleBtn);

toggleBtn.addEventListener('click', async () => {
  overlay.style.display = 'flex';
  backBtn.style.display = 'inline-block';
  toggleBtn.style.display = 'none';
  searchContainer.style.display = 'none';
  renderResults();

  if (buttonText === "Community Prices") {
    await checkWhatsNew();
  }
});


  backBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    backBtn.style.display = 'none';
    toggleBtn.style.display = 'inline-block';
    searchContainer.style.display = 'flex';
  });

  searchInput.addEventListener('input', e => renderResults(e.target.value));
};

createPricesOverlay('communityOverlay', 'Community_prices.json', 'Community Prices');
createPricesOverlay('dejavuOverlay', 'Dejavu_prices.json', 'Dejavu Prices');
createPricesOverlay(
  'artaOverlay',
  'https://cc.bladingbasics.com/data/Arta%27s_deco_prices.json',
  "Arta’s Deco Prices"
);





  
// Tools overlay elements
const toolsOverlay = document.getElementById('toolsOverlay');
const toolsResults = document.getElementById('toolsResults');
const toolsToggleBtn = document.getElementById('toolsToggleBtn');
const toolsBackBtn = document.getElementById('toolsBackBtn');
const toolsSearch = document.getElementById('toolsSearch');

// Build a list item for Tools recipes
const buildToolsItem = (recipe, highlightText) => {
  const li = document.createElement('li');
  li.className = 'resultItem';

  const nameWrap = document.createElement('div');
  nameWrap.className = 'recipeName';
  const re = new RegExp(escapeRegExp(highlightText || ''), 'ig');
  nameWrap.innerHTML = highlightText
    ? recipe.name.replace(re, m => `<mark>${m}</mark>`)
    : recipe.name;

  const star = document.createElement('button');
  star.className = 'starBtn';
  if (favorites.includes(recipe.name)) star.classList.add('active');
  star.innerHTML = '★';
  star.addEventListener('click', e => {
    e.stopPropagation();
    const idx = favorites.indexOf(recipe.name);
    if (idx === -1) {
      favorites.push(recipe.name);
      star.classList.add('active');
    } else {
      favorites.splice(idx, 1);
      star.classList.remove('active');
    }
    saveFavorites();
  });

  li.append(nameWrap, star);
  li.addEventListener('click', () => openRecipe(recipe));
  return li;
};

// Render Tools recipes
const renderToolsResults = (query = '') => {
  toolsResults.innerHTML = '';
  const q = query.trim().toLowerCase();

  // Filter recipes with 'Tools' category
  const list = recipes.filter(r => r.categories && r.categories.some(c => c.toLowerCase() === 'tools'));
  const filtered = q ? list.filter(r => r.name.toLowerCase().includes(q)) : list;

  if (filtered.length === 0) {
    toolsResults.innerHTML = '<li style="padding:8px;">No Tools recipes found.</li>';
  } else {
    filtered.forEach(r => toolsResults.appendChild(buildToolsItem(r, q)));
  }
};

// Hide by default
toolsToggleBtn.style.display = 'none';

// Show only on home page
if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
  toolsToggleBtn.style.display = 'none';

  toolsToggleBtn.addEventListener('click', () => {
    toolsOverlay.style.display = 'flex';
    toolsToggleBtn.style.display = 'none';
    toolsBackBtn.style.display = 'none';
    searchContainer.style.display = 'none';
    minesOverlay.style.display = 'none';
    renderToolsResults();
    document.body.style.height = '500px';
  });

  toolsBackBtn.addEventListener('click', () => {
    toolsOverlay.style.display = 'none';
    toolsBackBtn.style.display = 'none';
    toolsToggleBtn.style.display = 'none';
    searchContainer.style.display = 'flex';
    document.body.style.height = '250px';
  });

  toolsSearch.addEventListener('input', e => renderToolsResults(e.target.value));
}





  // Mines elements
  const minesOverlay = document.getElementById('minesOverlay');
  const minesContent = document.getElementById('minesContent');
  const mineToggleBtn = document.getElementById('mineToggleBtn'); 
  const mineBackBtn = document.getElementById('mineBackBtn');
  const mineOverlayBackBtn = document.getElementById('mineOverlayBackBtn');


  const storageAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  const storageGet = async (key) => storageAvailable
    ? new Promise(r => chrome.storage.local.get(key, res => r(res[key])))
    : JSON.parse(localStorage.getItem(key) || 'null');
  const storageSet = async (key, value) => storageAvailable
    ? new Promise(r => chrome.storage.local.set({ [key]: value }, r))
    : localStorage.setItem(key, JSON.stringify(value));

  let favorites = await storageGet('favorites') || [];
  let recent = await storageGet('recent') || [];
  let theme = await storageGet('theme') || 'light';
  let currentRecipe = null, currentLinkIndex = 0;

  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '🌙' : '🌓';

  const saveFavorites = () => storageSet('favorites', favorites);
  const saveRecent = () => storageSet('recent', recent);
  const saveTheme = () => storageSet('theme', theme);

  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const buildItem = (recipe, highlightText) => {
    const li = document.createElement('li');
    li.className = 'resultItem';
    const nameWrap = document.createElement('div');
    nameWrap.className = 'recipeName';
    const re = new RegExp(escapeRegExp(highlightText || ''), 'ig');
    nameWrap.innerHTML = highlightText
      ? recipe.name.replace(re, m => `<mark>${m}</mark>`)
      : recipe.name;

    const star = document.createElement('button');
    star.className = 'starBtn';
    if (favorites.includes(recipe.name)) star.classList.add('active');
    star.innerHTML = '★';
    star.addEventListener('click', e => {
      e.stopPropagation();
      const idx = favorites.indexOf(recipe.name);
      if (idx === -1) {
        favorites.push(recipe.name);
        star.classList.add('active');
      } else {
        favorites.splice(idx, 1);
        star.classList.remove('active');
      }
      saveFavorites();
    });

    li.append(nameWrap, star);
    li.addEventListener('click', () => openRecipe(recipe));
    return li;
  };

  const renderResults = (query = '', focusSection = null) => {
    results.innerHTML = '';
    const q = query.trim().toLowerCase();
    let list = recipes;

    if (focusSection === 'favorites') {
      list = recipes.filter(r => favorites.includes(r.name));
    } else if (focusSection === 'recent') {
      list = recipes.filter(r => recent.includes(r.name));
    } else if (q) {
      list = recipes.filter(r => r.name.toLowerCase().includes(q));

    }

    if (list.length === 0) {
      results.classList.remove('show');
      results.style.display = 'none';
      document.body.style.height = `${INITIAL_SEARCH_HEIGHT}px`;
      return;
    }

    list.forEach(r => results.appendChild(buildItem(r, q)));
    results.classList.add('show');
    results.style.display = 'block';
    const totalRows = results.querySelectorAll('li.resultItem').length;
    document.body.style.height = `${Math.min(ROW_HEIGHT * totalRows + 150, 475)}px`;
  };

const openRecipe = recipe => {
  currentRecipe = recipe;
  
  // Try to find the wiki link first
  const wikiLink = recipe.links.find(link => link.includes('fandom.com/wiki'));
  
  // Default to the first link if no wiki link exists
  frame.src = wikiLink || recipe.links[0] || '';
  
  currentLinkIndex = 0; // start at first link
  viewer.style.display = 'flex';       // Show full-page viewer
  viewerBtns.style.display = 'flex';   // Show back/toggle buttons
  searchContainer.style.display = 'none';
  minesOverlay.style.display = 'none';
  toolsOverlay.style.display = 'none';

  // Save recent
  recent = [recipe.name, ...recent.filter(n => n !== recipe.name)].slice(0, 5);
  saveRecent();

  document.body.style.height = '100vh'; // Optional, forces full-page
};



 backBtn.addEventListener('click', () => {
  viewer.style.display = 'none';
  viewerBtns.style.display = 'none';
  searchContainer.style.display = 'flex';
  toolsToggleBtn.style.display = 'none';
  mineToggleBtn.style.display = 'none';
  document.body.style.height = '250px'; // Reset page height
});



  themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '🌙' : '🌓';
    saveTheme();
  });

  favListBtn.addEventListener('click', () => renderResults('', 'favorites'));
  recentBtn.addEventListener('click', () => renderResults('', 'recent'));
  searchInput.addEventListener('input', e => renderResults(e.target.value));

  // ✅ Toggle link button
  toggleBtn.addEventListener('click', () => {
    if (!currentRecipe) return;
    currentLinkIndex = (currentLinkIndex + 1) % currentRecipe.links.length;
    frame.src = currentRecipe.links[currentLinkIndex];
  });

  // ✅ Mines overlay
  const mineData = {
    "Tropical Mine": ["Tropical Grass", "Mountain", "Sand", "Half Sand", "Water", "Coral", "Lava", "Soil", "Dirt", "Ruby", "Rubber Tree", "Palm Tree", "Cotton Bush", "Bush", "Fairy Dust", "Flowers"],
    "Forest Mine": ["Grass", "Water", "Mud", "Dirt", "Tree", "Sunberry Bushes", "Bushes", "Lily pad", "Flowers", "Stone", "Coal", "Iron", "Silver", "Beeswax", "Honey", "Fairy Dust", "Gold"],
    "Desert Mine": ["Boulder", "Mesa Top", "Mesa", "Water", "Mud", "Sand", "Dirt", "Cactus", "Palm Tree", "Chiliberry Bush", "Egg", "Stone", "Gold", "Silver", "Iron", "Coal", "Bone", "Sticks"],
    "Mountain Mine": ["Snow", "Mountain Boulder", "Ice", "Mountain", "Mountain Grass", "Cave Wall", "Pine Tree", "Yumberry Bush", "Egg", "Stone", "Coal", "Iron", "Silver", "Beeswax", "Honey", "Gold", "Sticks"],
    "Arctic Mine": ["Ice Boulder", "Mountain Boulder", "Snow", "Oil", "Mountain", "Mountain Grass", "Ice", "Dirt", "Dead Tree", "Snowy Pine Tree", "Frostberrie", "Fast Geyser", "Slow Geyser", "Coal", "Iron", "Silver", "Gold", "Sticks"]
  };

  // Mines overlay
mineToggleBtn.addEventListener('click', () => {
  minesContent.innerHTML = '';

  Object.entries(mineData).forEach(([mineName, items]) => {
    const header = document.createElement('div');
    header.className = 'sectionHeader';
    header.textContent = mineName;

    const ul = document.createElement('ul');
    ul.style.display = 'none';
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '10px';

    // ✅ Make each mine item clickable
    items.forEach(itemName => {
      const li = document.createElement('li');
      li.textContent = itemName;
      li.className = 'resultItem';

      li.addEventListener('click', () => {
        const cleanName = itemName.replace(/\*$/, '').trim(); // remove trailing * if any
        const recipe = recipes.find(r => r.name.toLowerCase() === cleanName.toLowerCase());
        if (recipe) {
          minesOverlay.style.display = 'none';
          mineBackBtn.style.display = 'none';
          openRecipe(recipe);
        } else {
          console.warn(`Recipe not found: "${cleanName}"`);
        }
      });

      ul.appendChild(li);
    });

    header.addEventListener('click', () => {
      ul.style.display = ul.style.display === 'none' ? 'block' : 'none';
    });

    minesContent.appendChild(header);
    minesContent.appendChild(ul);
  });

  // Show overlay
  minesOverlay.style.display = 'flex';
  mineToggleBtn.style.display = 'none';
  mineBackBtn.style.display = 'inline-block';
  searchInput.style.display = 'none';
  results.style.display = 'none';
  document.body.style.height = '450px';
});


mineBackBtn.addEventListener('click', () => {
  minesOverlay.style.display = 'none';
  mineBackBtn.style.display = 'none';
  mineToggleBtn.style.display = 'inline-block';
  searchInput.style.display = 'block';
  results.style.display = 'block';
  document.body.style.height = '250px'; // match new default
});

// Show Mines overlay
mineToggleBtn.addEventListener('click', () => {
  minesContent.innerHTML = '';

  Object.entries(mineData).forEach(([mineName, items]) => {
    const header = document.createElement('div');
    header.className = 'sectionHeader';
    header.textContent = mineName;

    const ul = document.createElement('ul');
    ul.style.display = 'none';
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '10px';

    items.forEach(itemName => {
      const li = document.createElement('li');
      li.textContent = itemName;
      li.className = 'resultItem';

      li.addEventListener('click', () => {
        const cleanName = itemName.replace(/\*$/, '').trim();
        const recipe = recipes.find(r => r.name.toLowerCase() === cleanName.toLowerCase());
        if (recipe) {
          minesOverlay.style.display = 'none';
          mineOverlayBackBtn.style.display = 'none';
          openRecipe(recipe);
        }
      });

      ul.appendChild(li);
    });

    header.addEventListener('click', () => {
      ul.style.display = ul.style.display === 'none' ? 'block' : 'none';
    });

    minesContent.appendChild(header);
    minesContent.appendChild(ul);
  });

  // Show overlay
  minesOverlay.style.display = 'flex';
  mineToggleBtn.style.display = 'none';
  mineOverlayBackBtn.style.display = 'inline-block';

  toolsOverlay.style.display = 'none';
  toolsToggleBtn.style.display = 'none';
  toolsBackBtn.style.display = 'none';

  searchContainer.style.display = 'none';
  results.style.display = 'none';
  document.body.style.height = '450px';
});

// Hide Mines overlay
mineOverlayBackBtn.addEventListener('click', () => {
  minesOverlay.style.display = 'none';
  mineOverlayBackBtn.style.display = 'none';
  mineToggleBtn.style.display = 'inline-block';

  searchContainer.style.display = 'flex';
  results.style.display = 'block';
  document.body.style.height = '250px';
});

// ===== BUTTON CLICK =====
document.getElementById("plotTimerBtn")?.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) return;

    chrome.scripting.executeScript({
      target: { tabId },
      func: injectPlotTimer
    });
  });
});

// ===== INJECTED FUNCTION (PAGE CONTEXT) =====
function injectPlotTimer() {
  if (window.__PLOT_TIMER__) return;
  window.__PLOT_TIMER__ = true;

  let timeoutId = null;
  let endTime = null;
  let lastDurationMs = null;
  let minimized = false;
  let lastShownSec = null;

  const WARNING_MS = 5 * 60 * 1000;

  const box = document.createElement("div");
  box.style = `
    position: fixed;
    bottom: 18px;
    right: 18px;
    z-index: 999999;
    background: #1e1e1e;
    color: #fff;
    padding: 10px 12px;
    border-radius: 12px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    width: 190px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    user-select: none;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes ptFlash {
      0% { background:#1e1e1e; }
      50% { background:#7a1c1c; }
      100% { background:#1e1e1e; }
    }
    .pt-warning { animation: ptFlash 1s infinite; }
  `;
  document.head.appendChild(style);

box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
    <div id="pt-label" style="font-weight:bold;">⏳ Plot Timer</div>
    <div style="display:flex;gap:4px;">
      <button id="pt-min" title="Minimize">➖</button>
      <button id="pt-close" title="Close">✖</button>
    </div>
  </div>

  <div id="pt-controls">
    <input
      id="pt-input"
      type="number"
      min="1"
      step="1"
      placeholder="Min"
      style="
        width:70px;
        padding:4px 6px;
        margin-bottom:6px;
        color:#000;
        text-align:center;
      "
    />

    <div style="display:flex;gap:6px;">
      <button id="pt-start">Start</button>
      <button id="pt-reset">Reset</button>
      <button id="pt-stop">Stop</button>
    </div>
  </div>
`;


  document.body.appendChild(box);

const label = box.querySelector("#pt-label");
const input = box.querySelector("#pt-input");
const controls = box.querySelector("#pt-controls");
const minBtn = box.querySelector("#pt-min");
const closeBtn = box.querySelector("#pt-close");

// Style close button
closeBtn.style.background = "#444";
closeBtn.style.color = "#fff";

// Close logic
closeBtn.onclick = () => {
  clearTimeout(timeoutId);
  box.remove();
  window.__PLOT_TIMER__ = false;
};



  input.addEventListener("wheel", e => e.preventDefault(), { passive: false });
  ["keydown","keyup","keypress","mousedown"].forEach(ev =>
    input.addEventListener(ev, e => e.stopPropagation())
  );

  function format(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

function tick() {
  if (!endTime) return;

  const remaining = endTime - Date.now();
  const sec = Math.floor(remaining / 1000);

  if (sec !== lastShownSec) {
    lastShownSec = sec;
    label.textContent = `⏳ ${format(remaining)}`;
    box.classList.toggle("pt-warning", remaining <= WARNING_MS);
  }

  if (remaining <= 0) {
    label.textContent = "⏳ 0:00";
    alert("🚨 Plot Timer finished");
    return;
  }

  timeoutId = setTimeout(tick, remaining % 1000 || 1000);
}


  function start(ms) {
    clearTimeout(timeoutId);
    lastDurationMs = ms;
    endTime = Date.now() + ms;
    lastShownSec = null;
    tick();
  }

  minBtn.onclick = () => {
    minimized = !minimized;
    controls.style.display = minimized ? "none" : "block";
    box.style.width = minimized ? "110px" : "190px";
    minBtn.textContent = minimized ? "➕" : "➖";
  };

  box.querySelector("#pt-start").onclick = () => {
    const mins = Number(input.value);
    if (!mins || mins <= 0) return;
    start(mins * 60000);
  };

  box.querySelector("#pt-reset").onclick = () => {
    if (lastDurationMs) start(lastDurationMs);
  };

  box.querySelector("#pt-stop").onclick = () => {
    clearTimeout(timeoutId);
    box.classList.remove("pt-warning");
    label.textContent = "⏳ Plot Timer";
  };
}

const startupClose = document.getElementById("startupClose");
const startupOverlay = document.getElementById("startupOverlay");

if (startupClose && startupOverlay) {
  startupClose.onclick = () => {
    startupOverlay.style.display = "none";
  };
}

setTimeout(() => {
  const communityBtn = [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "Community Prices");

  if (!communityBtn) return;

  const originalClick = communityBtn.onclick;

  communityBtn.onclick = async () => {
    try {
      const res = await fetch(
  "https://cc.bladingbasics.com/data/whats_new.json",
  { cache: "no-store" }
);

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        originalClick?.();
        return;
      }

      const latest = data[0];
      if (!latest.id) {
        originalClick?.();
        return;
      }

      const seenKey = `seen_whatsnew_${latest.id}`;

      // ALREADY SEEN → go straight to community prices
      if (localStorage.getItem(seenKey)) {
        originalClick?.();
        return;
      }

      // NOT SEEN → show popup
      const overlay = document.getElementById("startupOverlay");
      if (overlay) overlay.style.display = "flex";

      const closeBtn = document.getElementById("startupClose");
      if (closeBtn) {
        closeBtn.onclick = () => {
          localStorage.setItem(seenKey, "true");
          overlay.style.display = "none";
          originalClick?.();
        };
      }

    } catch (err) {
      console.warn("WhatsNew check failed:", err);
      originalClick?.();
    }
  };
}, 0);


console.log("WhatsNew latest ID:", Array.isArray(latest) ? latest[0]?.id : latest?.id);



  document.body.style.height = '250px';
});
