import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, trackerPath } from "./firebase-config.js";

const AXES = [575, 594, 614, 633, 653, 672, 692, 711];
const WORLD = "United Arab Emirates";
const $ = (id) => document.getElementById(id);
const rowsEl = $("coordinateRows");
const localStorageKey = "dragon-prince-coordinates-v1";
const firebaseConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_")
  && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("YOUR_")
  && firebaseConfig.appId && !firebaseConfig.appId.startsWith("YOUR_");

const initialFound = new Set([
  "594:594","594:633","594:672","594:711",
  "614:575","614:614","614:653","614:692",
  "633:594","633:633","633:672","633:711",
  "653:575","653:614","653:653","653:692",
  "672:594","672:633","672:672","672:711",
  "692:575","692:614","692:653","692:692",
  "711:594","711:633","711:672"
]);

const coordinates = [];
for (const x of AXES) for (const y of AXES) {
  const id = `${x}:${y}`;
  coordinates.push({ id, x, y, found: initialFound.has(id), appearanceDate: "", editedAt: "" });
}
const state = new Map(coordinates.map(item => [item.id, {...item}]));
let db = null;
let trackerRef = null;
let remoteReady = false;
let writeTimer = null;
let toastTimer = null;
let lastUpdatedMs = null;

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}
function dateLabel(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}
function updateStats() {
  const items = [...state.values()];
  const found = items.filter(item => item.found).length;
  $("foundCount").textContent = `${found} / ${items.length}`;
  $("progressPercent").textContent = `${Math.round(found / items.length * 100)}%`;
  $("lastUpdated").textContent = lastUpdatedMs ? new Date(lastUpdatedMs).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—";
}
function render() {
  const filter = $("statusFilter").value;
  const query = $("searchBox").value.trim().toLowerCase();
  const visible = [...state.values()].filter(item => {
    const matchesFilter = filter === "all" || (filter === "found" ? item.found : !item.found);
    return matchesFilter && item.id.toLowerCase().includes(query);
  });
  rowsEl.replaceChildren();
  for (const item of visible) {
    const tr = document.createElement("tr");
    tr.className = item.found ? "found-row" : "missing-row";

    const coordTd = document.createElement("td");
    const coord = document.createElement("span");
    coord.className = "coord";
    coord.textContent = item.id;
    coordTd.append(coord);

    const statusTd = document.createElement("td");
    const status = document.createElement("select");
    status.className = "status-select";
    status.setAttribute("aria-label", `Status for ${item.id}`);
    for (const [value,label] of [["missing","⬜ Dragon not found"],["found","✅ Dragon found"]]) {
      const option = document.createElement("option");
      option.value = value; option.textContent = label;
      status.append(option);
    }
    status.value = item.found ? "found" : "missing";
    status.addEventListener("change", () => updateItem(item.id, {found: status.value === "found"}));
    statusTd.append(status);

    const dateTd = document.createElement("td");
    const date = document.createElement("input");
    date.type = "datetime-local";
    date.className = "date-input";
    date.value = item.appearanceDate || "";
    date.setAttribute("aria-label", `Appearance date and time for ${item.id}`);
    date.addEventListener("change", () => updateItem(item.id, {appearanceDate: date.value}));
    dateTd.append(date);

    const editedTd = document.createElement("td");
    editedTd.className = "edited";
    editedTd.textContent = dateLabel(item.editedAt);
    tr.append(coordTd, statusTd, dateTd, editedTd);
    rowsEl.append(tr);
  }
  $("visibleCount").textContent = `${visible.length} coordinate${visible.length === 1 ? "" : "s"}`;
  updateStats();
}
function saveLocal() {
  try { localStorage.setItem(localStorageKey, JSON.stringify([...state.values()])); } catch {}
}
function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(localStorageKey) || "null");
    if (!Array.isArray(saved)) return;
    for (const item of saved) {
      if (!state.has(item.id)) continue;
      state.set(item.id, {...state.get(item.id), found: !!item.found, appearanceDate: item.appearanceDate || "", editedAt: item.editedAt || ""});
    }
  } catch {}
}
function updateItem(id, patch) {
  const old = state.get(id);
  if (!old) return;
  const updated = {...old, ...patch, editedAt: new Date().toISOString()};
  state.set(id, updated);
  lastUpdatedMs = Date.now();
  saveLocal();
  render();
  if (db && trackerRef && remoteReady) {
    clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      try {
        await setDoc(trackerRef, {
          world: WORLD,
          coordinates: Object.fromEntries([...state.values()].map(item => [item.id, {
            found: item.found,
            appearanceDate: item.appearanceDate,
            editedAt: item.editedAt
          }])),
          updatedAt: serverTimestamp()
        }, {merge: true});
        setConnection(true, "Live sync connected");
      } catch (err) {
        console.error(err);
        setConnection(false, "Sync error");
        showToast("Could not sync. Check Firestore rules and your Firebase config.");
      }
    }, 250);
  }
}
function setConnection(online, text) {
  const el = $("connection");
  el.textContent = text;
  el.className = `connection ${online ? "online" : "offline"}`;
}
function applyRemote(data) {
  if (data && data.coordinates) {
    for (const [id, remote] of Object.entries(data.coordinates)) {
      if (!state.has(id) || !remote || typeof remote !== "object") continue;
      state.set(id, {
        ...state.get(id),
        found: typeof remote.found === "boolean" ? remote.found : state.get(id).found,
        appearanceDate: typeof remote.appearanceDate === "string" ? remote.appearanceDate : state.get(id).appearanceDate,
        editedAt: typeof remote.editedAt === "string" ? remote.editedAt : state.get(id).editedAt
      });
    }
  }
  lastUpdatedMs = Date.now();
  saveLocal();
  render();
}
function markdownEscape(value) { return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " "); }
function buildMarkdown() {
  const items = [...state.values()];
  const lines = [
    `# Dragon Prince Coordinates`,
    ``,
    `World: ${WORLD}`,
    ``,
    `| Coordinates | Status | Appearance Date |`,
    `|:--|:--|:--|`,
    ...items.map(item => `| \`${item.id}\` | ${item.found ? "✅ Dragon found" : "⬜ Dragon not found"} | ${item.appearanceDate ? markdownEscape(item.appearanceDate.replace("T", " ")) : "—"} |`),
    ``,
    `Last generated: ${new Date().toLocaleString()}`
  ];
  return lines.join("\n");
}
function openExport() {
  $("markdownOutput").value = buildMarkdown();
  $("exportPanel").hidden = false;
  $("exportPanel").scrollIntoView({behavior:"smooth", block:"start"});
}
$("statusFilter").addEventListener("change", render);
$("searchBox").addEventListener("input", render);
$("exportBtn").addEventListener("click", openExport);
$("closeExport").addEventListener("click", () => $("exportPanel").hidden = true);
$("copyBtn").addEventListener("click", async () => {
  const text = buildMarkdown();
  try {
    await navigator.clipboard.writeText(text);
    showToast("Markdown copied to clipboard.");
  } catch {
    openExport();
    $("markdownOutput").focus();
    $("markdownOutput").select();
    showToast("Select and copy the Markdown text below.");
  }
});

loadLocal();
render();

if (firebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    trackerRef = doc(db, trackerPath.collection, trackerPath.document);
    onSnapshot(trackerRef, snapshot => {
      remoteReady = true;
      if (snapshot.exists()) {
        applyRemote(snapshot.data());
      } else {
        // Seed Firestore once with the provided initial statuses, without overwriting existing data.
        setDoc(trackerRef, {
          world: WORLD,
          coordinates: Object.fromEntries([...state.values()].map(item => [item.id, {
            found: item.found,
            appearanceDate: item.appearanceDate,
            editedAt: item.editedAt
          }])),
          updatedAt: serverTimestamp()
        }).catch(err => {
          console.error(err);
          setConnection(false, "Sync error");
        });
      }
      setConnection(true, "Live sync connected");
      $("setupPanel").hidden = true;
    }, err => {
      console.error(err);
      setConnection(false, "Firestore access denied");
      showToast("Firebase connected, but Firestore rejected the read. Check your security rules.");
    });
  } catch (err) {
    console.error(err);
    setConnection(false, "Firebase config error");
  }
} else {
  setConnection(false, "Local demo mode");
}
