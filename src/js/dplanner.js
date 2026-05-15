const STORAGE_PREFIX = "dplanner";
const HOURS_IN_DAY = 24;

let timeline;
let dateInput;
let clearDayButton;
let totalTasks;
let plannedHours;
let currentHour;

let selectedDate;
let plannerData = {};

window.addEventListener("DOMContentLoaded", () => {
  timeline = document.querySelector("#planner-grid");
  dateInput = document.querySelector("#planner-date");
  clearDayButton = document.querySelector("#clear-day");
  totalTasks = document.querySelector("#total-tasks");
  plannedHours = document.querySelector("#planned-hours");
  currentHour = document.querySelector("#current-hour");

  if (!timeline) {
    console.error("planner-grid not found!");
    return;
  }

  selectedDate = getTodayKey();

  dateInput.value = selectedDate;
  plannerData = loadPlannerData(selectedDate);

  renderPlanner();

  dateInput.addEventListener("change", () => {
    selectedDate = dateInput.value || getTodayKey();
    plannerData = loadPlannerData(selectedDate);
    renderPlanner();
  });

  clearDayButton.addEventListener("click", () => {
    plannerData = {};
    savePlannerData(selectedDate, plannerData);
    renderPlanner();
  });

  setInterval(refreshCurrentTime, 60 * 1000);
});

function renderPlanner() {
  timeline.innerHTML = "";

  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    timeline.appendChild(createTimeSlot(hour));
  }

  renderSummary();
}

function createTimeSlot(hour) {
  const slot = document.createElement("article");
  slot.className = isCurrentHour(hour) ? "time-slot current" : "time-slot";
  slot.dataset.hour = String(hour);

  const label = document.createElement("div");
  label.className = "time-label";
  label.textContent = formatHour(hour);

  const content = document.createElement("div");
  content.className = "slot-content";

  const form = document.createElement("form");
  form.className = "task-form";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask(hour, input.value);
    input.value = "";
  });

  const input = document.createElement("input");
  input.className = "task-input";
  input.type = "text";
  input.placeholder = `Add task at ${formatHour(hour)}`;
  input.ariaLabel = `Add task at ${formatHour(hour)}`;

  const addButton = document.createElement("button");
  addButton.className = "primary-button";
  addButton.type = "submit";
  addButton.textContent = "Add";

  form.append(input, addButton);
  content.append(form, createTaskList(hour));
  slot.append(label, content);

  return slot;
}

function createTaskList(hour) {
  const list = document.createElement("div");
  list.className = "task-list";

  getTasks(hour).forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";

    if (task.isEditing) {
      const editInput = document.createElement("input");
      editInput.className = "task-input task-edit-input";
      editInput.value = task.text;
      editInput.ariaLabel = "Edit task";

      const saveButton = createButton("Save", "icon-button", () => {
        updateTask(hour, task.id, { text: editInput.value, isEditing: false });
      });

      const cancelButton = createButton("Cancel", "icon-button", () => {
        updateTask(hour, task.id, { isEditing: false });
      });

      item.append(editInput, saveButton, cancelButton);
    } else {
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const editButton = createButton("Edit", "icon-button", () => {
        updateTask(hour, task.id, { isEditing: true });
      });

      const deleteButton = createButton("Delete", "icon-button delete", () => {
        deleteTask(hour, task.id);
      });

      item.append(text, editButton, deleteButton);
    }

    list.appendChild(item);
  });

  return list;
}

function addTask(hour, text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return;
  }

  const key = String(hour);
  const tasks = getTasks(hour);

  plannerData[key] = [
    ...tasks,
    {
      id: createTaskId(),
      text: trimmedText,
      isEditing: false,
    },
  ];

  savePlannerData(selectedDate, plannerData);
  renderPlanner();
}

function updateTask(hour, taskId, patch) {
  const key = String(hour);

  plannerData[key] = getTasks(hour)
    .map((task) => (task.id === taskId ? { ...task, ...patch } : task))
    .filter((task) => task.text.trim());

  savePlannerData(selectedDate, plannerData);
  renderPlanner();
}

function deleteTask(hour, taskId) {
  const key = String(hour);
  plannerData[key] = getTasks(hour).filter((task) => task.id !== taskId);

  if (plannerData[key].length === 0) {
    delete plannerData[key];
  }

  savePlannerData(selectedDate, plannerData);
  renderPlanner();
}

function getTasks(hour) {
  return plannerData[String(hour)] || [];
}

function renderSummary() {
  const tasksByHour = Object.values(plannerData);
  const taskCount = tasksByHour.reduce((count, tasks) => count + tasks.length, 0);
  const hourCount = tasksByHour.filter((tasks) => tasks.length > 0).length;

  totalTasks.textContent = taskCount;
  plannedHours.textContent = hourCount;
  currentHour.textContent = formatHour(new Date().getHours());
}

function refreshCurrentTime() {
  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.classList.toggle("current", isCurrentHour(Number(slot.dataset.hour)));
  });

  currentHour.textContent = formatHour(new Date().getHours());
}

function createButton(text, className, onClick) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);

  return button;
}

function loadPlannerData(dateKey) {
  const rawData = localStorage.getItem(getStorageKey(dateKey));

  if (!rawData) {
    return {};
  }

  try {
    return JSON.parse(rawData);
  } catch {
    return {};
  }
}

function savePlannerData(dateKey, data) {
  localStorage.setItem(getStorageKey(dateKey), JSON.stringify(data));
}

function getStorageKey(dateKey) {
  return `${STORAGE_PREFIX}:${dateKey}`;
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isCurrentHour(hour) {
  return selectedDate === getTodayKey() && hour === new Date().getHours();
}

function formatHour(hour) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function createTaskId() {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
