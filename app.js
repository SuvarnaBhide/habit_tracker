let items = JSON.parse(localStorage.getItem("crud_items") || "[]");
let editIndex = null;

const input = document.getElementById("titleInput");
const list = document.getElementById("itemList");
const emptyState = document.getElementById("emptyState");
const overlay = document.getElementById("modalOverlay");
const editInput = document.getElementById("editInput");

/* ── Persist ── */
function save() {
  localStorage.setItem("crud_items", JSON.stringify(items));
}

/* ── Render ── */
function render() {
  list.innerHTML = "";
  emptyState.style.display = items.length === 0 ? "block" : "none";

  items.forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `
      <span class="item-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="item-title">${escapeHTML(item)}</span>
      <div class="item-actions">
        <button class="btn-icon btn-edit" title="Edit" onclick="openEdit(${i})">
          ${iconEdit()}
        </button>
        <button class="btn-icon btn-delete" title="Delete" onclick="deleteItem(${i})">
          ${iconDelete()}
        </button>
      </div>
    `;
    list.appendChild(li);
  });
}

/* ── Add ── */
function addItem() {
  const val = input.value.trim();
  if (!val) {
    shake(input);
    return;
  }
  items.unshift(val);
  save();
  render();
  input.value = "";
  input.focus();
}

/* ── Delete ── */
function deleteItem(i) {
  items.splice(i, 1);
  save();
  render();
}

/* ── Edit Modal ── */
function openEdit(i) {
  editIndex = i;
  editInput.value = items[i];
  overlay.classList.add("open");
  setTimeout(() => editInput.focus(), 50);
}

function closeModal() {
  overlay.classList.remove("open");
  editIndex = null;
}

function saveEdit() {
  const val = editInput.value.trim();
  if (!val) {
    shake(editInput);
    return;
  }
  items[editIndex] = val;
  save();
  render();
  closeModal();
}

/* ── Keyboard ── */
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addItem();
});
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEdit();
  if (e.key === "Escape") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
});

/* ── Helpers ── */
function shake(el) {
  el.style.animation = "none";
  el.offsetHeight; // reflow
  el.style.animation = "shake 0.3s ease";
  el.addEventListener("animationend", () => (el.style.animation = ""), {
    once: true,
  });
  // inject shake keyframes once
  if (!document.getElementById("shake-style")) {
    const s = document.createElement("style");
    s.id = "shake-style";
    s.textContent = `@keyframes shake {
      0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)}
    }`;
    document.head.appendChild(s);
  }
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconEdit() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
}

function iconDelete() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;
}

/* ── Init ── */
render();
