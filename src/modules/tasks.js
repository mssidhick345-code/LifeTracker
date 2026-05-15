import { scheduleTask } from "./scheduler.js";
import { debugLog, debugWarn } from "../utils/debug.js";
import { clampScore, formatTaskStatus } from "../utils/helpers.js";
import { createId, getAppData, updateAppData } from "../utils/storage.js";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskDescriptionInput = document.querySelector("#task-description-input");
const taskPriorityInput = document.querySelector("#task-priority-input");
const taskGoalInput = document.querySelector("#task-goal-input");
const taskList = document.querySelector("#task-list");
const filterButtons = document.querySelectorAll("[data-task-filter]");
const totalCount = document.querySelector("#task-total-count");
const completedCount = document.querySelector("#task-completed-count");
const completionPercent = document.querySelector("#task-completion-percent");

let appData = getAppData();
let activeFilter = "all";
let editingTaskId = null;

export function initTasks() {
  assertTaskElements();
  debugLog("tasks", "Initializing task module");
  renderGoalOptions();
  renderTasks();

  taskForm.addEventListener("submit", handleSubmitTask);
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.taskFilter));
  });
}

export function refreshTasks() {
  renderTasks();
}

function handleSubmitTask(event) {
  event.preventDefault();

  const title = taskInput.value.trim();

  if (!title) {
    debugWarn("tasks", "Task creation blocked: missing title");
    taskInput.focus();
    return;
  }

  const payload = {
    title,
    description: taskDescriptionInput.value.trim(),
    priority: taskPriorityInput.value,
    goalId: taskGoalInput.value || null,
  };

  if (editingTaskId) {
    debugLog("tasks", "Updating task", { taskId: editingTaskId, title });
    appData = updateAppData((data) => ({
      ...data,
      tasks: data.tasks.map((task) =>
        task.id === editingTaskId ? { ...task, ...payload } : task,
      ),
    }));
  } else {
    debugLog("tasks", "Creating task", { title, goalId: payload.goalId });
    appData = updateAppData((data) => ({
      ...data,
      tasks: [
        {
          id: createId("task"),
          ...payload,
          status: "pending",
          metrics: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
        ...data.tasks,
      ],
    }));
  }

  resetForm();
  notifyDataChanged();
}

function setFilter(filter) {
  activeFilter = filter;
  renderTasks();
}

function editTask(taskId) {
  const task = appData.tasks.find((item) => item.id === taskId);

  if (!task) {
    debugWarn("tasks", "Edit skipped: task not found", { taskId });
    return;
  }

  editingTaskId = task.id;
  taskInput.value = task.title;
  taskDescriptionInput.value = task.description || "";
  taskPriorityInput.value = task.priority || "medium";
  taskGoalInput.value = task.goalId || "";
  taskInput.focus();
}

function deleteTask(taskId) {
  debugLog("tasks", "Deleting task", { taskId });
  appData = updateAppData((data) => ({
    ...data,
    tasks: data.tasks.filter((task) => task.id !== taskId),
    schedule: data.schedule.filter((slot) => slot.taskId !== taskId),
  }));

  notifyDataChanged();
}

function toggleTaskStatus(taskId) {
  const task = appData.tasks.find((item) => item.id === taskId);

  if (!task) {
    debugWarn("tasks", "Complete skipped: task not found", { taskId });
    return;
  }

  const isCompleting = task.status !== "completed";
  const metrics = isCompleting ? promptForMetrics() : null;
  debugLog("tasks", "Changing task status", { taskId, nextStatus: isCompleting ? "completed" : "pending" });

  appData = updateAppData((data) => ({
    ...data,
    tasks: data.tasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            status: isCompleting ? "completed" : "pending",
            metrics,
            completedAt: isCompleting ? new Date().toISOString() : null,
          }
        : item,
    ),
  }));

  notifyDataChanged();
}

function addToSchedule(taskId) {
  debugLog("tasks", "Add to Schedule clicked", { taskId });
  const wasScheduled = scheduleTask(taskId);

  if (wasScheduled) {
    appData = getAppData();
  }
}

function promptForMetrics() {
  const mood = clampScore(window.prompt("Mood after completing this task? (1-10)", "7"));
  const energy = clampScore(window.prompt("Energy during this task? (1-10)", "7"));
  const focus = clampScore(window.prompt("Focus during this task? (1-10)", "7"));

  return {
    mood: mood ?? 7,
    energy: energy ?? 7,
    focus: focus ?? 7,
  };
}

function renderTasks() {
  appData = getAppData();
  debugLog("tasks", "Rendering tasks", { count: appData.tasks.length, filter: activeFilter });
  taskList.innerHTML = "";
  renderGoalOptions();
  updateFilterButtons();
  updateStats();

  const visibleTasks = getVisibleTasks();

  if (visibleTasks.length === 0) {
    taskList.appendChild(createEmptyState());
    return;
  }

  visibleTasks.forEach((task) => taskList.appendChild(createTaskRow(task)));
}

function createTaskRow(task) {
  const row = document.createElement("article");
  row.className = task.status === "completed" ? "task-row completed" : "task-row";

  const taskMain = document.createElement("div");
  taskMain.className = "task-main";

  const body = document.createElement("div");
  body.className = "task-body";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("p");
  meta.className = "task-meta";
  meta.textContent = getTaskMeta(task);

  const description = document.createElement("p");
  description.className = "task-description";
  description.textContent = task.description || "No description added.";

  body.append(title, meta, description);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createActionButton(
      task.status === "completed" ? "Pending" : "Complete",
      () => toggleTaskStatus(task.id),
      task.status === "completed" ? "task-complete active" : "task-complete",
    ),
    createActionButton("Add to Schedule", () => addToSchedule(task.id), "task-schedule"),
    createActionButton("Edit", () => editTask(task.id), "task-edit"),
    createActionButton("Delete", () => deleteTask(task.id), "task-delete"),
  );

  taskMain.append(body, actions);
  row.append(taskMain);

  if (task.metrics) {
    const metrics = document.createElement("p");
    metrics.className = "task-metrics";
    metrics.textContent = `Mood ${task.metrics.mood}/10 | Energy ${task.metrics.energy}/10 | Focus ${task.metrics.focus}/10`;
    row.append(metrics);
  }

  return row;
}

function createActionButton(label, onClick, className) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);

  return button;
}

function createEmptyState() {
  const empty = document.createElement("p");
  empty.className = "task-empty";
  empty.textContent = "No tasks in this view.";

  return empty;
}

function getVisibleTasks() {
  if (activeFilter === "completed") {
    return appData.tasks.filter((task) => task.status === "completed");
  }

  if (activeFilter === "pending") {
    return appData.tasks.filter((task) => task.status !== "completed");
  }

  return appData.tasks;
}

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.taskFilter === activeFilter);
  });
}

function updateStats() {
  const completedTasks = appData.tasks.filter((task) => task.status === "completed").length;
  const percent =
    appData.tasks.length === 0 ? 0 : Math.round((completedTasks / appData.tasks.length) * 100);

  totalCount.textContent = appData.tasks.length;
  completedCount.textContent = completedTasks;
  completionPercent.textContent = `${percent}%`;
}

function renderGoalOptions() {
  if (!taskGoalInput) {
    return;
  }

  taskGoalInput.innerHTML = '<option value="">Independent task</option>';
  appData.goals.forEach((goal) => {
    const option = document.createElement("option");
    option.value = goal.id;
    option.textContent = goal.title;
    taskGoalInput.appendChild(option);
  });
}

function getTaskMeta(task) {
  const goal = appData.goals.find((item) => item.id === task.goalId);
  const goalLabel = goal ? `Goal: ${goal.title}` : "Independent";

  return `${formatTaskStatus(task.status)} | ${task.priority} priority | ${goalLabel}`;
}

function resetForm() {
  editingTaskId = null;
  taskForm.reset();
  taskPriorityInput.value = "medium";
}

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent("app:data-changed", { detail: { source: "tasks" } }));
}

export { renderTasks };

function assertTaskElements() {
  const missing = [
    ["taskForm", taskForm],
    ["taskInput", taskInput],
    ["taskList", taskList],
  ].filter(([, element]) => !element);

  if (missing.length > 0) {
    debugWarn("tasks", "Missing task DOM elements", missing.map(([name]) => name));
  }
}
