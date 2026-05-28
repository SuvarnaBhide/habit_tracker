/* ═══════════════════════════════════════════
   BLOOM · Habit Tracker
   Data:
     sections = [{ id, name }]
     habits   = [{
       id, name, sectionId|null,
       type: 'mark'|'meas',
       qty: number, unit: string,   // meas only
       days: { 'YYYY-MM-DD': { status, note } }
     }]
═══════════════════════════════════════════ */

/* ── State ── */
let sections = JSON.parse(localStorage.getItem("bloom_sections") || "[]");
let habits = JSON.parse(localStorage.getItem("bloom_habits") || "[]");

// Migrate old data (flat status strings → {status, note})
habits.forEach((h) => {
  if (!h.days) h.days = {};
  Object.keys(h.days).forEach((k) => {
    if (typeof h.days[k] === "string")
      h.days[k] = { status: h.days[k], note: "" };
  });
  if (!h.type) h.type = "mark";
});

/* ── Persistence ── */
function save() {
  localStorage.setItem("bloom_sections", JSON.stringify(sections));
  localStorage.setItem("bloom_habits", JSON.stringify(habits));
}

/* ── Utilities ── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function esc(s) {
  return String(s)
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
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const TODAY = toKey(new Date());
const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getLast7() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

function getStreak(habit) {
  let streak = 0;
  const d = new Date();
  while (true) {
    const k = toKey(d);
    const entry = habit.days[k];
    const st = entry?.status;
    if (st === "done" || st === "warn") {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (st === "skip") {
      d.setDate(d.getDate() - 1);
    } // skip doesn't break
    else break;
    if (streak > 365) break;
  }
  return streak;
}

function getPct(habit) {
  const keys = Object.keys(habit.days);
  if (!keys.length) return 0;
  const done = keys.filter((k) => {
    const st = habit.days[k]?.status;
    return st === "done" || st === "warn";
  }).length;
  return Math.round((done / keys.length) * 100);
}

function getOverallPct() {
  if (!habits.length) return 0;
  const total = habits.reduce((a, h) => a + getPct(h), 0);
  return Math.round(total / habits.length);
}

/* ════════════════════════════════════════
   INLINE PICKER
════════════════════════════════════════ */
const inlinePicker = document.getElementById("inlinePicker");
const pickerNoteInput = document.getElementById("pickerNoteInput");
const noteDelBtn = document.getElementById("noteDelBtn");

let pickHabitId = null;
let pickDate = null;
let pickerContext = "home"; // 'home' | 'detail'

function openInlinePicker(habitId, dateKey, anchorEl, context) {
  // close any open picker first
  if (
    inlinePicker.classList.contains("open") &&
    pickHabitId === habitId &&
    pickDate === dateKey
  ) {
    closePicker();
    return;
  }
  pickHabitId = habitId;
  pickDate = dateKey;
  pickerContext = context || "home";

  const habit = habits.find((h) => h.id === habitId);
  const entry = habit?.days[dateKey] || {};
  pickerNoteInput.value = entry.note || "";
  noteDelBtn.style.display = entry.note ? "flex" : "none";

  // position below anchor
  inlinePicker.style.position = "fixed";
  inlinePicker.style.display = "flex";
  inlinePicker.style.zIndex = "200";

  const rect = anchorEl.getBoundingClientRect();
  let top = rect.bottom + 10 + window.scrollY;
  let left = rect.left + rect.width / 2 - 95;
  const pickerW = 190;
  if (left < 8) left = 8;
  if (left + pickerW > window.innerWidth - 8)
    left = window.innerWidth - pickerW - 8;
  inlinePicker.style.top = `${rect.bottom + 10}px`;
  inlinePicker.style.left = `${left}px`;
  inlinePicker.style.transform = "none";
  inlinePicker.classList.add("open");
}

function closePicker() {
  // save note before closing
  if (pickHabitId && pickDate) {
    const habit = habits.find((h) => h.id === pickHabitId);
    if (habit) {
      if (!habit.days[pickDate])
        habit.days[pickDate] = { status: "empty", note: "" };
      const noteVal = pickerNoteInput.value.trim();
      habit.days[pickDate].note = noteVal;
      if (!noteVal && habit.days[pickDate].status === "empty") {
        delete habit.days[pickDate];
      }
      save();
    }
  }
  inlinePicker.classList.remove("open");
  inlinePicker.style.display = "none";
  pickHabitId = null;
  pickDate = null;
  renderHome();
  if (detailHabitId) renderDetailCal();
}

function setPick(status) {
  const habit = habits.find((h) => h.id === pickHabitId);
  if (!habit) return closePicker();
  if (!habit.days[pickDate]) habit.days[pickDate] = { status: "", note: "" };
  if (status === "empty") {
    habit.days[pickDate].status = "empty";
  } else {
    habit.days[pickDate].status = status;
  }
  noteDelBtn.style.display = habit.days[pickDate].note ? "flex" : "none";
  save();
  renderHome();
  if (detailHabitId) renderDetailCal();
}

function deletePickNote() {
  const habit = habits.find((h) => h.id === pickHabitId);
  if (habit && habit.days[pickDate]) {
    habit.days[pickDate].note = "";
    pickerNoteInput.value = "";
    noteDelBtn.style.display = "none";
    save();
  }
}

// note auto-save on input
pickerNoteInput.addEventListener("input", () => {
  noteDelBtn.style.display = pickerNoteInput.value.trim() ? "flex" : "none";
});

// close picker on outside click
document.addEventListener("click", (e) => {
  if (
    inlinePicker.classList.contains("open") &&
    !inlinePicker.contains(e.target) &&
    !e.target.closest(".day-cell") &&
    !e.target.closest(".cal-cell")
  ) {
    closePicker();
  }
});

/* ════════════════════════════════════════
   HOME RENDER
════════════════════════════════════════ */
function renderHome() {
  const listEl = document.getElementById("habitList");
  const emptyEl = document.getElementById("emptyState");
  const fillEl = document.getElementById("overallFill");
  const pctEl = document.getElementById("overallPct");
  listEl.innerHTML = "";

  const pct = getOverallPct();
  fillEl.style.width = pct + "%";
  pctEl.textContent = pct + "%";
  document.getElementById("overallBar").style.display = habits.length
    ? "flex"
    : "none";

  const isEmpty = habits.length === 0;
  emptyEl.style.display = isEmpty ? "flex" : "none";
  if (isEmpty) return;

  const days = getLast7();

  // Render "Add section" button at top
  const addSecBtn = document.createElement("button");
  addSecBtn.className = "btn-sec-icon";
  addSecBtn.style.cssText =
    "margin-bottom:12px;padding:7px 12px;border-radius:8px;border:1px dashed var(--border);width:auto;font-size:0.75rem;font-weight:700;color:var(--text-soft);display:flex;align-items:center;gap:5px;background:transparent;cursor:pointer;";
  addSecBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg> Add Section`;
  addSecBtn.onclick = () => openSectionModal(null);
  listEl.appendChild(addSecBtn);

  // Render sections
  sections.forEach((sec) => {
    const secHabits = habits.filter((h) => h.sectionId === sec.id);
    renderSectionBlock(listEl, sec, secHabits, days);
  });

  // Unsectioned habits
  const unsec = habits.filter((h) => !h.sectionId);
  if (unsec.length) {
    const wrap = document.createElement("div");
    wrap.className = "unsectioned-habits";
    unsec.forEach((h) => wrap.appendChild(renderHabitCard(h, days)));
    listEl.appendChild(wrap);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function renderSectionBlock(container, sec, secHabits, days) {
  const collapsed = sec._collapsed || false;

  const block = document.createElement("div");

  const row = document.createElement("div");
  row.className = "section-row" + (collapsed ? " collapsed" : "");
  row.innerHTML = `
    <svg class="section-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    <span class="section-name">${esc(sec.name)}</span>
    <div class="section-actions">
      <button class="btn-sec-icon" title="Add habit to section" onclick="event.stopPropagation();openAddHabitInSection('${sec.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
      </button>
      <button class="btn-sec-icon" title="Edit section" onclick="event.stopPropagation();openSectionModal('${sec.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-sec-icon danger" title="Delete section" onclick="event.stopPropagation();openDeleteSection('${sec.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  `;
  row.onclick = () => {
    sec._collapsed = !sec._collapsed;
    renderHome();
  };

  const habitsWrap = document.createElement("div");
  habitsWrap.className = "section-habits" + (collapsed ? " collapsed" : "");
  secHabits.forEach((h) => {
    const card = renderHabitCard(h, days);
    // drag to move between sections
    card.draggable = true;
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("habitId", h.id);
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    habitsWrap.appendChild(card);
  });

  // drop zone on section row
  row.addEventListener("dragover", (e) => {
    e.preventDefault();
    row.classList.add("drag-over");
  });
  row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
  row.addEventListener("drop", (e) => {
    e.preventDefault();
    row.classList.remove("drag-over");
    const hId = e.dataTransfer.getData("habitId");
    const h = habits.find((x) => x.id === hId);
    if (h) {
      h.sectionId = sec.id;
      save();
      renderHome();
    }
  });

  block.appendChild(row);
  block.appendChild(habitsWrap);
  container.appendChild(block);
}

function renderHabitCard(habit, days) {
  const card = document.createElement("div");
  card.className = "habit-card";
  card.dataset.id = habit.id;

  const streak = getStreak(habit);
  const pct = getPct(habit);
  const secName = habit.sectionId
    ? sections.find((s) => s.id === habit.sectionId)?.name
    : null;

  const top = document.createElement("div");
  top.className = "habit-top";
  top.innerHTML = `
    <div class="habit-drag-handle" title="Drag to move">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </div>
    <div class="habit-info">
      <div class="habit-name" onclick="goDetail('${habit.id}')">${esc(habit.name)}</div>
      <div class="habit-meta">
        ${secName ? `<span class="habit-section-tag">${esc(secName)}</span>` : ""}
        ${habit.type === "meas" ? `<span class="habit-type-tag">Target: ${esc(habit.qty || "")} ${esc(habit.unit || "")}</span>` : ""}
        ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ""}
        <span class="habit-pct">${pct}%</span>
      </div>
    </div>
    <div class="habit-actions">
      <button class="btn-icon" title="Edit" onclick="openEditHabit('${habit.id}')">${iconEdit()}</button>
      <button class="btn-icon danger" title="Delete" onclick="openDeleteHabit('${habit.id}')">${iconTrash()}</button>
    </div>
  `;

  // days
  const daysRow = document.createElement("div");
  daysRow.className = "days-row";
  days.forEach((dateObj) => {
    const key = toKey(dateObj);
    const entry = habit.days[key] || {};
    const st = entry.status || "empty";
    const isToday = key === TODAY;
    const num = dateObj.getDate();
    const lbl = DAY_SHORT[dateObj.getDay()];

    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.setAttribute("tabindex", "0");

    const stClass = st && st !== "empty" ? ` s-${st}` : "";
    const todayClass = isToday ? " today-ring" : "";
    const hasNote = entry.note?.trim();
    cell.innerHTML = `
      <span class="day-lbl${isToday ? " today" : ""}">${lbl}</span>
      <div class="day-bubble${stClass}${todayClass}">
        <span class="day-num">${num}</span>
        ${hasNote ? '<span class="note-dot"></span>' : ""}
      </div>
    `;
    cell.onclick = (e) => {
      e.stopPropagation();
      openInlinePicker(habit.id, key, cell, "home");
    };
    daysRow.appendChild(cell);
  });

  card.appendChild(top);
  card.appendChild(daysRow);
  return card;
}

/* ════════════════════════════════════════
   DETAIL PAGE
════════════════════════════════════════ */
let detailHabitId = null;
let detailYear = null;
let detailMonth = null;
let detailChartInst = null;

function goDetail(id) {
  closePicker();
  detailHabitId = id;
  const h = habits.find((x) => x.id === id);
  document.getElementById("detailTitle").textContent = h?.name || "";
  const now = new Date();
  detailYear = now.getFullYear();
  detailMonth = now.getMonth();
  switchTab("cal");
  document.getElementById("homePage").classList.remove("active");
  document.getElementById("detailPage").classList.add("active");
  renderDetailCal();
}

function goHome() {
  closePicker();
  detailHabitId = null;
  document.getElementById("detailPage").classList.remove("active");
  document.getElementById("homePage").classList.add("active");
  renderHome();
}

function switchTab(tab) {
  document
    .getElementById("tabCalBtn")
    .classList.toggle("active", tab === "cal");
  document
    .getElementById("tabStatBtn")
    .classList.toggle("active", tab === "stat");
  document.getElementById("tabCal").style.display =
    tab === "cal" ? "block" : "none";
  document.getElementById("tabStat").style.display =
    tab === "stat" ? "block" : "none";
  if (tab === "stat") renderDetailStats();
}

function detailMonthShift(delta) {
  detailMonth += delta;
  if (detailMonth < 0) {
    detailMonth = 11;
    detailYear--;
  }
  if (detailMonth > 11) {
    detailMonth = 0;
    detailYear++;
  }
  renderDetailCal();
}

function renderDetailCal() {
  const habit = habits.find((h) => h.id === detailHabitId);
  if (!habit) return;

  document.getElementById("detailMonthLabel").textContent =
    `${MONTH_NAMES[detailMonth]} ${detailYear}`;

  const grid = document.getElementById("detailCalGrid");
  grid.innerHTML = "";

  // day headers
  DAY_SHORT.forEach((d) => {
    const h = document.createElement("div");
    h.className = "cal-header";
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(detailYear, detailMonth, 1).getDay();
  const daysInMonth = new Date(detailYear, detailMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell empty";
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(detailYear, detailMonth, d);
    const key = toKey(dateObj);
    const entry = habit.days[key] || {};
    const st = entry.status || "empty";
    const isToday = key === TODAY;
    const stClass = st && st !== "empty" ? ` s-${st}` : "";
    const todayClass = isToday ? " today-ring" : "";
    const hasNote = entry.note?.trim();

    const cell = document.createElement("div");
    cell.className = `cal-cell${stClass}${todayClass}`;
    cell.innerHTML = `${d}${hasNote ? '<span class="note-dot"></span>' : ""}`;
    cell.onclick = (e) => {
      e.stopPropagation();
      openInlinePicker(habit.id, key, cell, "detail");
    };
    grid.appendChild(cell);
  }

  // render notes below
  renderDetailNotes(habit);
}

function renderDetailNotes(habit) {
  const el = document.getElementById("detailNotesList");
  el.innerHTML = "";

  const noteDays = Object.entries(habit.days)
    .filter(([, v]) => v.note?.trim())
    .sort(([a], [b]) => b.localeCompare(a));

  if (!noteDays.length) return;

  const header = document.createElement("p");
  header.className = "notes-header";
  header.textContent = "Notes";
  el.appendChild(header);

  const list = document.createElement("div");
  list.className = "notes-list";
  noteDays.forEach(([key, entry]) => {
    const [y, m, d] = key.split("-");
    const label = `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`;
    const item = document.createElement("div");
    item.className = "note-item";
    item.innerHTML = `
      <span class="note-item-date">${esc(label)}</span>
      <span class="note-item-text">${esc(entry.note)}</span>
      <button class="note-item-del" title="Delete note" onclick="deleteNote('${habit.id}','${key}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    list.appendChild(item);
  });
  el.appendChild(list);
}

function deleteNote(habitId, dateKey) {
  const habit = habits.find((h) => h.id === habitId);
  if (habit && habit.days[dateKey]) {
    habit.days[dateKey].note = "";
    if (habit.days[dateKey].status === "empty") delete habit.days[dateKey];
    save();
    renderDetailCal();
    renderHome();
  }
}

function renderDetailStats() {
  const habit = habits.find((h) => h.id === detailHabitId);
  if (!habit) return;

  const streak = getStreak(habit);
  const pct = getPct(habit);
  const total = Object.keys(habit.days).filter((k) => {
    const st = habit.days[k]?.status;
    return st && st !== "empty";
  }).length;

  const chipsEl = document.getElementById("detailStatChips");
  chipsEl.innerHTML = `
    <div class="stat-chip"><span class="stat-chip-label">Streak</span><span class="stat-chip-value">🔥 ${streak}</span></div>
    <div class="stat-chip"><span class="stat-chip-label">Done %</span><span class="stat-chip-value">${pct}%</span></div>
    <div class="stat-chip"><span class="stat-chip-label">Total days</span><span class="stat-chip-value">${total}</span></div>
  `;

  // build last 30 days chart
  const labels = [],
    values = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toKey(d);
    const entry = habit.days[key] || {};
    const st = entry.status;
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    if (habit.type === "meas") {
      values.push(entry.value != null ? entry.value : null);
    } else {
      values.push(
        st === "done" ? 1 : st === "warn" ? 0.5 : st === "skip" ? null : 0,
      );
    }
  }

  if (detailChartInst) {
    detailChartInst.destroy();
    detailChartInst = null;
  }
  const ctx = document.getElementById("lineChart").getContext("2d");
  detailChartInst = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#6b8f5e",
          backgroundColor: "rgba(107,143,94,0.10)",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#6b8f5e",
          tension: 0.35,
          spanGaps: true,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              habit.type === "meas"
                ? `${ctx.raw} ${habit.unit || ""}`
                : ["—", "Partial", "Done"][Math.round(ctx.raw * 2)] || "—",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: { size: 9, family: "Nunito" },
            color: "#a8a79f",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
          },
          grid: { display: false },
        },
        y: {
          ticks: { font: { size: 9, family: "Nunito" }, color: "#a8a79f" },
          grid: { color: "rgba(0,0,0,0.05)" },
          min: 0,
        },
      },
    },
  });
}

/* ════════════════════════════════════════
   ADD / EDIT HABIT MODAL
════════════════════════════════════════ */
let habitModalMode = "add"; // 'add' | 'edit'
let habitModalId = null;
let habitModalType = "mark";
let preselectedSection = null;

function populateSectionSelect(selectedId) {
  const sel = document.getElementById("hmSection");
  sel.innerHTML = '<option value="">— No section —</option>';
  sections.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.name;
    if (s.id === selectedId) o.selected = true;
    sel.appendChild(o);
  });
}

function setHabitType(t) {
  habitModalType = t;
  document.getElementById("typeMark").classList.toggle("active", t === "mark");
  document.getElementById("typeMeas").classList.toggle("active", t === "meas");
  document.getElementById("measFields").style.display =
    t === "meas" ? "block" : "none";
}

function openAddHabit() {
  // check if quick-input has text
  const quick = document.getElementById("habitInput").value.trim();
  habitModalMode = "add";
  habitModalId = null;
  document.getElementById("habitModalLabel").textContent = "Add habit";
  document.getElementById("hmName").value = quick || "";
  populateSectionSelect(preselectedSection || "");
  setHabitType("mark");
  document.getElementById("hmQty").value = "";
  document.getElementById("hmUnit").value = "";
  openModal("habitModal");
  setTimeout(() => document.getElementById("hmName").focus(), 80);
}

function openAddHabitInSection(secId) {
  preselectedSection = secId;
  openAddHabit();
}

function openEditHabit(id) {
  const h = habits.find((x) => x.id === id);
  if (!h) return;
  habitModalMode = "edit";
  habitModalId = id;
  document.getElementById("habitModalLabel").textContent = "Edit habit";
  document.getElementById("hmName").value = h.name;
  populateSectionSelect(h.sectionId || "");
  setHabitType(h.type || "mark");
  document.getElementById("hmQty").value = h.qty || "";
  document.getElementById("hmUnit").value = h.unit || "";
  openModal("habitModal");
  setTimeout(() => document.getElementById("hmName").focus(), 80);
}

function closeHabitModal() {
  closeModal("habitModal");
  preselectedSection = null;
  document.getElementById("habitInput").value = "";
}

function saveHabitModal() {
  const name = document.getElementById("hmName").value.trim();
  if (!name) {
    shake(document.getElementById("hmName"));
    return;
  }
  const secId = document.getElementById("hmSection").value || null;
  const type = habitModalType;
  const qty = parseFloat(document.getElementById("hmQty").value) || null;
  const unit = document.getElementById("hmUnit").value.trim() || "";

  if (habitModalMode === "add") {
    habits.unshift({
      id: uid(),
      name,
      sectionId: secId,
      type,
      qty,
      unit,
      days: {},
    });
  } else {
    const h = habits.find((x) => x.id === habitModalId);
    if (h) Object.assign(h, { name, sectionId: secId, type, qty, unit });
  }
  save();
  closeHabitModal();
  renderHome();
}

// also allow pressing Enter in habit quick-input
document.getElementById("habitInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") openAddHabit();
});

/* ════════════════════════════════════════
   SECTION MODAL
════════════════════════════════════════ */
let sectionModalId = null;

function openSectionModal(id) {
  sectionModalId = id;
  const isEdit = id !== null;
  document.getElementById("sectionModalLabel").textContent = isEdit
    ? "Edit section"
    : "Add section";
  const sec = isEdit ? sections.find((s) => s.id === id) : null;
  document.getElementById("smName").value = sec?.name || "";
  openModal("sectionModal");
  setTimeout(() => document.getElementById("smName").focus(), 80);
}

function closeSectionModal() {
  closeModal("sectionModal");
}

function saveSectionModal() {
  const name = document.getElementById("smName").value.trim();
  if (!name) {
    shake(document.getElementById("smName"));
    return;
  }
  if (sectionModalId) {
    const sec = sections.find((s) => s.id === sectionModalId);
    if (sec) sec.name = name;
  } else {
    sections.push({ id: uid(), name });
  }
  save();
  closeSectionModal();
  renderHome();
}

/* ════════════════════════════════════════
   DELETE MODAL
════════════════════════════════════════ */
let deleteModalCallback = null;

function openDeleteHabit(id) {
  const h = habits.find((x) => x.id === id);
  document.getElementById("deleteModalLabel").textContent = "Delete habit?";
  document.getElementById("deleteModalName").textContent = h?.name || "";
  document.getElementById("deleteModalSub").textContent =
    "All tracking data will be removed.";
  deleteModalCallback = () => {
    habits = habits.filter((x) => x.id !== id);
    save();
    renderHome();
  };
  openModal("deleteModal");
}

function openDeleteSection(id) {
  const sec = sections.find((s) => s.id === id);
  document.getElementById("deleteModalLabel").textContent = "Delete section?";
  document.getElementById("deleteModalName").textContent = sec?.name || "";
  document.getElementById("deleteModalSub").textContent =
    "Habits will remain but become unsectioned.";
  deleteModalCallback = () => {
    sections = sections.filter((s) => s.id !== id);
    habits.forEach((h) => {
      if (h.sectionId === id) h.sectionId = null;
    });
    save();
    renderHome();
  };
  openModal("deleteModal");
}

function closeDeleteModal() {
  closeModal("deleteModal");
  deleteModalCallback = null;
}
function confirmDeleteModal() {
  deleteModalCallback?.();
  closeDeleteModal();
}

/* ════════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// close modals on overlay click
["habitModal", "sectionModal", "deleteModal"].forEach((id) => {
  document.getElementById(id).addEventListener("click", (e) => {
    if (e.target === document.getElementById(id)) closeModal(id);
  });
});

// ESC key
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["habitModal", "sectionModal", "deleteModal"].forEach(closeModal);
  closePicker();
});

/* ════════════════════════════════════════
   ICONS
════════════════════════════════════════ */
function iconEdit() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}
function iconTrash() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
renderHome();
