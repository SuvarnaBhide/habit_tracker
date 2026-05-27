/* ─────────────────────────
   Bloom · Habit Tracker
   statuses: done | warn | miss | skip | empty
───────────────────────── */

let habits = JSON.parse(localStorage.getItem("bloom_habits") || "[]");

let editId = null;
let deleteId = null;
let pickId = null;
let pickDate = null;

const habitInput = document.getElementById("habitInput");
const habitList = document.getElementById("habitList");
const emptyState = document.getElementById("emptyState");
const editOverlay = document.getElementById("editOverlay");
const editInput = document.getElementById("editInput");
const deleteOverlay = document.getElementById("deleteOverlay");
const deleteHabitName = document.getElementById("deleteHabitName");
const pickerOverlay = document.getElementById("pickerOverlay");
const pickerTitle = document.getElementById("pickerTitle");

/* ── Helpers ── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function save() {
  localStorage.setItem("bloom_habits", JSON.stringify(habits));
}
function escapeHTML(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function shake(el) {
  el.style.animation = "none";
  void el.offsetHeight;
  el.style.animation = "shake 0.3s ease";
  el.addEventListener("animationend", () => (el.style.animation = ""), {
    once: true,
  });
}

/* ── Date helpers ── */
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getLast7() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ── Render ── */
function render() {
  habitList.innerHTML = "";
  const isEmpty = habits.length === 0;
  emptyState.style.display = isEmpty ? "flex" : "none";
  if (isEmpty) {
    emptyState.style.flexDirection = "column";
    emptyState.style.alignItems = "center";
  }

  const todayKey = toKey(new Date());
  const days = getLast7();

  habits.forEach((habit) => {
    const card = document.createElement("div");
    card.className = "habit-card";

    /* header */
    const header = document.createElement("div");
    header.className = "habit-header";
    header.innerHTML = `
      <span class="habit-name">${escapeHTML(habit.name)}</span>
      <div class="habit-actions">
        <button class="btn-icon btn-edit"   aria-label="Edit"   onclick="openEdit('${habit.id}')">${iconEdit()}</button>
        <button class="btn-icon btn-delete" aria-label="Delete" onclick="openDelete('${habit.id}')">${iconDelete()}</button>
      </div>
    `;

    /* days grid */
    const grid = document.createElement("div");
    grid.className = "days-grid";

    days.forEach((dateObj) => {
      const key = toKey(dateObj);
      const status = (habit.days && habit.days[key]) || "empty";
      const isToday = key === todayKey;
      const num = dateObj.getDate();
      const label = DAY_SHORT[dateObj.getDay()];

      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `${label} ${num}`);
      cell.onclick = () => openPicker(habit.id, key, label, num);
      cell.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ")
          openPicker(habit.id, key, label, num);
      };

      cell.innerHTML = `
        <span class="day-label ${isToday ? "today-label" : ""}">${label}</span>
        <div class="day-bubble ${isToday ? "is-today" : ""} ${status !== "empty" ? "status-" + status : ""}">
          <span class="day-num">${num}</span>
        </div>
      `;
      grid.appendChild(cell);
    });

    card.appendChild(header);
    card.appendChild(grid);
    habitList.appendChild(card);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}

/* ── Add ── */
function addHabit() {
  const val = habitInput.value.trim();
  if (!val) {
    shake(habitInput);
    return;
  }
  habits.unshift({ id: uid(), name: val, days: {} });
  save();
  render();
  habitInput.value = "";
  habitInput.focus();
}

/* ── Picker ── */
function openPicker(id, dateKey, label, num) {
  pickId = id;
  pickDate = dateKey;
  pickerTitle.textContent = `${label} · ${num}`;
  pickerOverlay.classList.add("open");
}
function closePicker() {
  pickerOverlay.classList.remove("open");
  pickId = pickDate = null;
}
function setPick(status) {
  const habit = habits.find((h) => h.id === pickId);
  if (!habit) return closePicker();
  if (!habit.days) habit.days = {};
  if (status === "empty") delete habit.days[pickDate];
  else habit.days[pickDate] = status;
  save();
  render();
  closePicker();
}

/* ── Edit ── */
function openEdit(id) {
  editId = id;
  const h = habits.find((h) => h.id === id);
  editInput.value = h ? h.name : "";
  editOverlay.classList.add("open");
  setTimeout(() => editInput.focus(), 80);
}
function closeEdit() {
  editOverlay.classList.remove("open");
  editId = null;
}
function saveEdit() {
  const val = editInput.value.trim();
  if (!val) {
    shake(editInput);
    return;
  }
  const h = habits.find((h) => h.id === editId);
  if (h) {
    h.name = val;
    save();
    render();
  }
  closeEdit();
}

/* ── Delete ── */
function openDelete(id) {
  deleteId = id;
  const h = habits.find((h) => h.id === id);
  deleteHabitName.textContent = h ? h.name : "";
  deleteOverlay.classList.add("open");
}
function closeDelete() {
  deleteOverlay.classList.remove("open");
  deleteId = null;
}
function confirmDelete() {
  habits = habits.filter((h) => h.id !== deleteId);
  save();
  render();
  closeDelete();
}

/* ── Keyboard / backdrop ── */
habitInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addHabit();
});
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEdit();
  if (e.key === "Escape") closeEdit();
});
pickerOverlay.addEventListener("click", (e) => {
  if (e.target === pickerOverlay) closePicker();
});
editOverlay.addEventListener("click", (e) => {
  if (e.target === editOverlay) closeEdit();
});
deleteOverlay.addEventListener("click", (e) => {
  if (e.target === deleteOverlay) closeDelete();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (pickerOverlay.classList.contains("open")) closePicker();
  if (editOverlay.classList.contains("open")) closeEdit();
  if (deleteOverlay.classList.contains("open")) closeDelete();
});

/* ── Icons ── */
function iconEdit() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
}
function iconDelete() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;
}

render();
