const habitInput = document.getElementById("habitInput");
const addHabitBtn = document.getElementById("addHabitBtn");
const habitList = document.getElementById("habitList");

let habits = JSON.parse(localStorage.getItem("habits")) || [];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function saveHabits() {
  localStorage.setItem(
    "habits",
    JSON.stringify(habits)
  );
}

function renderHabits() {

  habitList.innerHTML = "";

  const today = getToday();

  habits.forEach(habit => {

    const completedToday =
      habit.completedDates.includes(today);

    const card = document.createElement("div");
    card.className = "habit-card";

    card.innerHTML = `
      <div class="habit-left">
        <input
          type="checkbox"
          class="habit-check"
          ${completedToday ? "checked" : ""}
        />

        <span class="${completedToday ? "completed" : ""}">
          ${habit.name}
        </span>
      </div>

      <button class="delete-btn">
        Delete
      </button>
    `;

    const checkbox =
      card.querySelector(".habit-check");

    checkbox.addEventListener("change", () => {

      if (checkbox.checked) {

        habit.completedDates.push(today);

      } else {

        habit.completedDates =
          habit.completedDates.filter(
            date => date !== today
          );
      }

      saveHabits();
      renderHabits();
    });

    const deleteBtn =
      card.querySelector(".delete-btn");

    deleteBtn.addEventListener("click", () => {

      habits = habits.filter(
        h => h.id !== habit.id
      );

      saveHabits();
      renderHabits();
    });

    habitList.appendChild(card);
  });
}

addHabitBtn.addEventListener("click", () => {

  const name = habitInput.value.trim();

  if (!name) return;

  const newHabit = {
    id: Date.now(),
    name,
    completedDates: []
  };

  habits.push(newHabit);

  saveHabits();

  habitInput.value = "";

  renderHabits();
});

renderHabits();

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker.register("./sw.js");
  });
}