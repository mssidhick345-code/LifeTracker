import { debugLog, debugWarn } from "../utils/debug.js";
import { getTodayKey } from "../utils/helpers.js";
import { createId, getAppData, updateAppData } from "../utils/storage.js";

const plannerGrid = document.querySelector("#planner-grid");
const dateInput = document.querySelector("#planner-date");
const scheduledCount = document.querySelector("#scheduled-count");
const completedCount = document.querySelector("#completed-count");
const openCount = document.querySelector("#open-count");
const togglePlannerButton = document.querySelector("#toggle-planner");

let selectedDateKey = getTodayKey();
let isCollapsed = false;

export function initScheduler() {
  if (!plannerGrid || !dateInput) {
    debugWarn("schedule", "Scheduler init skipped: missing planner DOM");
    return;
  }

  debugLog("schedule", "Initializing scheduler");
  dateInput.value = selectedDateKey;
  dateInput.addEventListener("change", (event) => {
    selectedDateKey = event.target.value || getTodayKey();
    renderSchedule();
  });

  if (togglePlannerButton) {
    togglePlannerButton.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      plannerGrid.classList.toggle("collapsed", isCollapsed);
      togglePlannerButton.textContent = isCollapsed ? "Expand" : "Collapse";
    });
  }

  renderSchedule();
}

export function scheduleTask(taskId) {
  const appData = getAppData();
  const task = appData.tasks.find((item) => item.id === taskId);

  if (!task) {
    debugWarn("schedule", "Schedule blocked: task not found", { taskId });
    window.alert("Task not found. Please refresh and try again.");
    return false;
  }

  const selectedTime = window.prompt("Select a time slot for today (24-hour HH:MM)", "09:00");

  if (!selectedTime) {
    debugWarn("schedule", "Schedule blocked: no time selected", { taskId });
    window.alert("Please select a time before adding this task to the schedule.");
    return false;
  }

  if (!isValidTime(selectedTime)) {
    debugWarn("schedule", "Schedule blocked: invalid time", { taskId, selectedTime });
    window.alert("Use 24-hour time format, for example 09:00 or 18:30.");
    return false;
  }

  const date = getTodayKey();
  const hasDuplicateTime = appData.schedule.some(
    (entry) => entry.date === date && entry.time === selectedTime && entry.taskId !== taskId,
  );

  if (hasDuplicateTime) {
    debugWarn("schedule", "Schedule blocked: duplicate time", { selectedTime, date });
    window.alert("That time slot already has a task. Choose another time.");
    return false;
  }

  debugLog("schedule", "Creating schedule entry", { taskId, selectedTime, date });
  updateAppData((data) => ({
    ...data,
    schedule: [
      ...data.schedule.filter((entry) => !(entry.date === date && entry.taskId === taskId)),
      {
        id: createId("schedule"),
        taskId,
        time: selectedTime,
        date,
      },
    ],
  }));

  selectedDateKey = date;
  dateInput.value = date;
  notifyDataChanged();
  window.dispatchEvent(new CustomEvent("schedule:updated", { detail: { date, taskId } }));
  return true;
}

export function renderSchedule() {
  if (!plannerGrid) {
    return;
  }

  const appData = getAppData();
  const schedule = appData.schedule.filter((entry) => entry.date === selectedDateKey);
  const currentHour = new Date().getHours();
  debugLog("schedule", "Rendering schedule", { date: selectedDateKey, count: schedule.length });

  plannerGrid.innerHTML = "";

  for (let hour = 0; hour < 24; hour += 1) {
    const hourKey = `${String(hour).padStart(2, "0")}:00`;
    const entries = schedule.filter((entry) => getHourFromTime(entry.time) === hour);
    plannerGrid.appendChild(createTimeSlot(hourKey, entries, appData.tasks, hour === currentHour));
  }

  updateStats(schedule, appData.tasks);
}

export { renderSchedule as renderScheduler };

function createTimeSlot(hourKey, entries, tasks, isCurrentHour) {
  const row = document.createElement("article");
  row.className = isCurrentHour ? "schedule-row current" : "schedule-row";
  row.dataset.time = hourKey;

  const time = document.createElement("div");
  time.className = "schedule-time";
  time.textContent = hourKey;

  const content = document.createElement("div");
  content.className = "schedule-content";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "schedule-empty";
    empty.textContent = "No task scheduled";
    content.appendChild(empty);
  } else {
    entries
      .sort((left, right) => left.time.localeCompare(right.time))
      .forEach((entry) => content.appendChild(createScheduledTask(entry, tasks)));
  }

  row.append(time, content);
  return row;
}

function createScheduledTask(entry, tasks) {
  const task = tasks.find((item) => item.id === entry.taskId);
  const item = document.createElement("div");
  item.className = "scheduled-task";

  const title = document.createElement("div");
  title.className = "scheduled-title";
  title.textContent = task ? task.title : "Deleted task";

  const meta = document.createElement("span");
  meta.className = "scheduled-time";
  meta.textContent = entry.time;

  const remove = document.createElement("button");
  remove.className = "scheduled-remove";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeScheduleEntry(entry.id));

  item.append(title, meta, remove);
  return item;
}

function removeScheduleEntry(entryId) {
  debugLog("schedule", "Removing schedule entry", { entryId });
  updateAppData((data) => ({
    ...data,
    schedule: data.schedule.filter((entry) => entry.id !== entryId),
  }));

  notifyDataChanged();
}

function updateStats(schedule, tasks) {
  const completed = schedule.filter((entry) => {
    const task = tasks.find((item) => item.id === entry.taskId);
    return task?.status === "completed";
  }).length;

  scheduledCount.textContent = schedule.length;
  completedCount.textContent = completed;
  openCount.textContent = Math.max(schedule.length - completed, 0);
}

function getHourFromTime(time) {
  return Number((time || "00:00").split(":")[0]);
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent("app:data-changed", { detail: { source: "schedule" } }));
}
