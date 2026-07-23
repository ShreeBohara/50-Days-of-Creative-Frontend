const STORE_KEY = "guestbook";

export const PASTELS = ["#ffe1f2", "#e1f6ff", "#eaffd6", "#fff3cd", "#f0e1ff", "#ffe8d6", "#dcfff4", "#ffdede"];
export const ICONS = ["☺", "♥", "★", "✿", "♪", "☏", "✈", "☯"];
export const MAX_ENTRIES = 50;
export const NAME_MAX = 40;
export const MESSAGE_MAX = 280;

export function hashId(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function sanitizeEntry({ name, message } = {}) {
  const cleanName = String(name ?? "").trim().slice(0, NAME_MAX) || "anonymous";
  const cleanMessage = String(message ?? "").trim().slice(0, MESSAGE_MAX);
  return { name: cleanName, message: cleanMessage };
}

export function createEntry(input, createdAt, id) {
  const { name, message } = sanitizeEntry(input);
  const h = hashId(id);
  return {
    id,
    name,
    message,
    createdAt,
    colorIndex: h % PASTELS.length,
    iconIndex: (h >>> 3) % ICONS.length,
  };
}

export function addEntry(entries, entry) {
  return [entry, ...entries].slice(0, MAX_ENTRIES);
}

export const SEED_ENTRIES = [
  createEntry(
    {
      name: "xX_DragonMaster_Xx",
      message: "FIRST!!! awesome page, added you to my top 8. visit my dragon fanfic archive plz",
    },
    Date.UTC(2001, 2, 8, 16, 20),
    "seed-dragonmaster",
  ),
  createEntry(
    {
      name: "mom",
      message: "very nice sweetie. dinner is at 7. why does the computer scream when i pick up the phone?",
    },
    Date.UTC(2001, 3, 16, 18, 45),
    "seed-mom",
  ),
  createEntry(
    {
      name: "webmaster_steve",
      message: "greetings from my own cyber zone. cool counter. P.S. your marquee is crooked by 1px, fix it",
    },
    Date.UTC(2001, 5, 30, 3, 12),
    "seed-steve",
  ),
];

export function loadEntries(store) {
  // Seed only when the key has never existed — a visitor who deletes
  // every entry keeps an empty book.
  if (!store.has(STORE_KEY)) {
    store.setJSON(STORE_KEY, SEED_ENTRIES);
    return [...SEED_ENTRIES];
  }
  const raw = store.getJSON(STORE_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function renderEntryRow(entry) {
  const row = document.createElement("tr");
  row.className = `gb-row gb-color-${entry.colorIndex % PASTELS.length}`;
  row.dataset.entryId = entry.id;

  const icon = document.createElement("td");
  icon.className = "gb-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = ICONS[entry.iconIndex % ICONS.length];

  const name = document.createElement("td");
  name.className = "gb-name";
  name.textContent = entry.name;

  const message = document.createElement("td");
  message.className = "gb-message";
  message.textContent = entry.message;

  const date = document.createElement("td");
  date.className = "gb-date";
  date.textContent = formatDate(entry.createdAt);

  const actions = document.createElement("td");
  actions.className = "gb-actions";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "gb-delete";
  remove.dataset.deleteId = entry.id;
  remove.setAttribute("aria-label", `Delete the entry from ${entry.name}`);
  remove.textContent = "×";
  actions.appendChild(remove);

  row.append(icon, name, message, date, actions);
  return row;
}

function randomId() {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}

export function initGuestbook({ form, tbody, statusEl, store }) {
  let entries = loadEntries(store);

  for (const entry of entries) tbody.appendChild(renderEntryRow(entry));

  function save() {
    store.setJSON(STORE_KEY, entries);
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const clean = sanitizeEntry({ name: data.get("name"), message: data.get("message") });
    if (!clean.message) {
      setStatus("you gotta actually type something!!");
      return;
    }
    const entry = createEntry(clean, Date.now(), randomId());
    entries = addEntry(entries, entry);
    save();
    tbody.prepend(renderEntryRow(entry));
    while (tbody.children.length > MAX_ENTRIES) tbody.lastElementChild.remove();
    form.reset();
    form.querySelector("[name='name']")?.focus();
    setStatus(`thanks ${entry.name}, you're famous now`);
  });

  tbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;
    const id = button.dataset.deleteId;
    entries = entries.filter((entry) => entry.id !== id);
    save();
    tbody.querySelector(`tr[data-entry-id="${id}"]`)?.remove();
    setStatus("entry deleted. the webmaster saw nothing.");
  });

  return {
    get entries() {
      return entries;
    },
  };
}
