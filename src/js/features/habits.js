import { scheduleTask } from "../../modules/scheduler.js";
import { createId, getAppData, updateAppData } from "../../utils/storage.js";
import { debugLog, debugWarn } from "../../utils/debug.js";
import { addDays, getRecentDateKeys, getTodayKey } from "../utils/date.js";

const habitForm = document.querySelector("#habit-form");
const habitInput = document.querySelector("#habit-input");
const habitList = document.querySelector("#habit-list");
const totalCount = document.querySelector("#habit-total-count");
const doneCount = document.querySelector("#habit-done-count");
const bestStreak = document.querySelector("#habit-best-streak");

let appData = getAppData();

export function initHabits() {
  debugLog("habits", "Initializing habits module");
  renderHabits();
  habitForm.addEventListener("submit", handleAddHabit);
}

export function getHabitStats() {
  appData = getAppData();
  const todayKey = getTodayKey();
  const streaks = appData.habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    streak: getStreakCount(habit),
  }));

  return {
    total: appData.habits.length,
    doneToday: appData.habits.filter((habit) => habit.history[todayKey]).length,
    bestStreak: Math.max(0, ...streaks.map((habit) => habit.streak)),
    streaks,
    habits: appData.habits,
  };
}

function handleAddHabit(event) {
  event.preventDefault();

  const name = habitInput.value.trim();

  if (!name) {
    debugWarn("habits", "Habit creation blocked: missing name");
    habitInput.focus();
    return;
  }

  debugLog("habits", "Creating habit", { name });
  appData = updateAppData((data) => ({
    ...data,
    habits: [
      {
        id: createId("habit"),
        name,
        streak: 0,
        history: {},
        createdAt: new Date().toISOString(),
      },
      ...data.habits,
    ],
  }));

  habitForm.reset();
  notifyDataChanged();
}

function toggleHabitToday(habitId) {
  const todayKey = getTodayKey();
  debugLog("habits", "Toggling habit for today", { habitId, todayKey });

  appData = updateAppData((data) => ({
    ...data,
    habits: data.habits.map((habit) => {
      if (habit.id !== habitId) {
        return habit;
      }

      const history = { ...habit.history, [todayKey]: !habit.history[todayKey] };
      const normalizedHistory = Object.fromEntries(
        Object.entries(history).filter(([, isDone]) => Boolean(isDone)),
      );

      const nextHabit = { ...habit, history: normalizedHistory };
      return { ...nextHabit, streak: getStreakCount(nextHabit) };
    }),
  }));

  notifyDataChanged();
}

function deleteHabit(habitId) {
  debugLog("habits", "Deleting habit", { habitId });
  appData = updateAppData((data) => ({
    ...data,
    habits: data.habits.filter((habit) => habit.id !== habitId),
  }));

  notifyDataChanged();
}

function scheduleHabit(habitId) {
  appData = getAppData();
  const habit = appData.habits.find((item) => item.id === habitId);

  if (!habit) {
    debugWarn("habits", "Schedule skipped: habit not found", { habitId });
    return;
  }

  const existingTask = appData.tasks.find((task) => task.id === habit.taskId);
  const taskId = existingTask ? existingTask.id : createId("task");

  if (!existingTask) {
    debugLog("habits", "Creating linked task for habit schedule", { habitId, taskId });
    appData = updateAppData((data) => ({
      ...data,
      habits: data.habits.map((item) =>
        item.id === habitId ? { ...item, taskId } : item,
      ),
      tasks: [
        {
          id: taskId,
          title: habit.name,
          description: "Habit task",
          priority: "medium",
          status: "pending",
          goalId: null,
          metrics: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
        ...data.tasks,
      ],
    }));
  }

  debugLog("habits", "Add to Schedule clicked for habit", { habitId, taskId });
  scheduleTask(taskId);
}

export function renderHabits() {
  appData = getAppData();
  debugLog("habits", "Rendering habits", { count: appData.habits.length });
  habitList.innerHTML = "";
  updateStats();

  if (appData.habits.length === 0) {
    habitList.appendChild(createEmptyState());
    return;
  }

  appData.habits.forEach((habit) => {
    habitList.appendChild(createHabitRow(habit));
  });
}

function createHabitRow(habit) {
  const todayKey = getTodayKey();
  const row = document.createElement("article");
  row.className = "habit-row";

  const summary = document.createElement("div");
  summary.className = "habit-summary";

  const doneButton = document.createElement("button");
  doneButton.className = habit.history[todayKey] ? "habit-check active" : "habit-check";
  doneButton.type = "button";
  doneButton.textContent = habit.history[todayKey] ? "\u2713" : "";
  doneButton.ariaLabel = habit.history[todayKey] ? "Mark habit undone today" : "Mark habit done today";
  doneButton.ariaPressed = String(Boolean(habit.history[todayKey]));
  doneButton.addEventListener("click", () => toggleHabitToday(habit.id));

  const titleWrap = document.createElement("div");
  const title = document.createElement("p");
  title.className = "habit-title";
  title.textContent = habit.name;

  const streak = document.createElement("p");
  streak.className = "habit-streak";
  streak.textContent = `${getStreakCount(habit)} day streak`;

  titleWrap.append(title, streak);

  const deleteButton = document.createElement("button");
  deleteButton.className = "habit-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.ariaLabel = `Delete ${habit.name}`;
  deleteButton.addEventListener("click", () => deleteHabit(habit.id));

  const scheduleButton = document.createElement("button");
  scheduleButton.className = "habit-schedule";
  scheduleButton.type = "button";
  scheduleButton.textContent = "Schedule";
  scheduleButton.addEventListener("click", () => scheduleHabit(habit.id));

  summary.append(doneButton, titleWrap, scheduleButton, deleteButton);
  row.append(summary, createCalendar(habit));

  return row;
}

function createCalendar(habit) {
  const calendar = document.createElement("div");
  calendar.className = "habit-calendar";

  getRecentDateKeys(14).forEach((dateKey) => {
    const day = document.createElement("span");
    day.className = habit.history[dateKey] ? "habit-day active" : "habit-day";
    day.title = dateKey;
    day.textContent = new Date(`${dateKey}T00:00:00`).toLocaleDateString([], { weekday: "narrow" });
    calendar.appendChild(day);
  });

  return calendar;
}

function createEmptyState() {
  const empty = document.createElement("p");
  empty.className = "habit-empty";
  empty.textContent = "No habits yet. Add one daily habit to start tracking consistency.";

  return empty;
}

function updateStats() {
  const stats = getHabitStats();

  totalCount.textContent = stats.total;
  doneCount.textContent = stats.doneToday;
  bestStreak.textContent = stats.bestStreak;
}

function getStreakCount(habit) {
  let streak = 0;
  let dateKey = getTodayKey();

  while (habit.history[dateKey]) {
    streak += 1;
    dateKey = addDays(dateKey, -1);
  }

  return streak;
}

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent("app:data-changed", { detail: { source: "habits" } }));
}
