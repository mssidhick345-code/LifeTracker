import { scheduleTask } from "../../modules/scheduler.js";
import { createId, getAppData, updateAppData } from "../../utils/storage.js";
import { debugLog, debugWarn } from "../../utils/debug.js";
import { getDaysUntil } from "../utils/date.js";

const goalForm = document.querySelector("#goal-form");
const goalTitleInput = document.querySelector("#goal-title-input");
const goalDeadlineInput = document.querySelector("#goal-deadline-input");
const goalList = document.querySelector("#goal-list");

let appData = getAppData();

export function initGoals() {
  debugLog("goals", "Initializing goals module");
  renderGoals();
  goalForm.addEventListener("submit", handleAddGoal);
}

function handleAddGoal(event) {
  event.preventDefault();

  const title = goalTitleInput.value.trim();

  if (!title) {
    debugWarn("goals", "Goal creation blocked: missing title");
    goalTitleInput.focus();
    return;
  }

  debugLog("goals", "Creating goal", { title });
  appData = updateAppData((data) => ({
    ...data,
    goals: [
      {
        id: createId("goal"),
        title,
        deadline: goalDeadlineInput.value,
        createdAt: new Date().toISOString(),
      },
      ...data.goals,
    ],
  }));

  goalForm.reset();
  notifyDataChanged();
}

function addGoalTask(goalId, taskTitle) {
  const title = taskTitle.trim();

  if (!title) {
    debugWarn("goals", "Goal task creation blocked: missing title", { goalId });
    return;
  }

  debugLog("goals", "Creating central task under goal", { goalId, title });
  appData = updateAppData((data) => ({
    ...data,
    tasks: [
      {
        id: createId("task"),
        title,
        description: "",
        priority: "medium",
        status: "pending",
        goalId,
        metrics: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      ...data.tasks,
    ],
  }));

  notifyDataChanged();
}

function toggleGoalTask(taskId) {
  debugLog("goals", "Toggling goal task status", { taskId });
  appData = updateAppData((data) => ({
    ...data,
    tasks: data.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: task.status === "completed" ? "pending" : "completed",
            completedAt: task.status === "completed" ? null : new Date().toISOString(),
          }
        : task,
    ),
  }));

  notifyDataChanged();
}

function deleteGoal(goalId) {
  debugLog("goals", "Deleting goal and unlinking tasks", { goalId });
  appData = updateAppData((data) => ({
    ...data,
    goals: data.goals.filter((goal) => goal.id !== goalId),
    tasks: data.tasks.map((task) =>
      task.goalId === goalId ? { ...task, goalId: null } : task,
    ),
  }));

  notifyDataChanged();
}

function deleteGoalTask(taskId) {
  debugLog("goals", "Deleting central task from goal", { taskId });
  appData = updateAppData((data) => ({
    ...data,
    tasks: data.tasks.filter((task) => task.id !== taskId),
    schedule: data.schedule.filter((entry) => entry.taskId !== taskId),
  }));

  notifyDataChanged();
}

function scheduleGoalTask(taskId) {
  debugLog("goals", "Add to Schedule clicked for goal task", { taskId });
  scheduleTask(taskId);
}

export function renderGoals() {
  appData = getAppData();
  debugLog("goals", "Rendering goals", { goals: appData.goals.length, tasks: appData.tasks.length });
  goalList.innerHTML = "";

  if (appData.goals.length === 0) {
    goalList.appendChild(createEmptyState());
    return;
  }

  appData.goals.forEach((goal) => {
    goalList.appendChild(createGoalCard(goal));
  });
}

function createGoalCard(goal) {
  const card = document.createElement("article");
  card.className = "goal-card";

  const goalTasks = appData.tasks.filter((task) => task.goalId === goal.id);
  const header = document.createElement("div");
  header.className = "goal-card-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = goal.title;

  const deadline = document.createElement("p");
  deadline.className = "goal-deadline";
  deadline.textContent = formatDeadline(goal.deadline);

  titleWrap.append(title, deadline);

  const deleteButton = document.createElement("button");
  deleteButton.className = "goal-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteGoal(goal.id));

  header.append(titleWrap, deleteButton);

  const progress = getGoalProgress(goalTasks);
  const progressWrap = document.createElement("div");
  progressWrap.className = "goal-progress";
  progressWrap.innerHTML = `<span style="width: ${progress}%"></span>`;

  const progressText = document.createElement("p");
  progressText.className = "goal-progress-text";
  progressText.textContent = `${progress}% complete`;

  const taskList = document.createElement("div");
  taskList.className = "goal-task-list";
  goalTasks.forEach((task) => taskList.appendChild(createGoalTask(task)));

  const taskForm = document.createElement("form");
  taskForm.className = "goal-task-form";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Create task under this goal...";
  input.autocomplete = "off";
  const addButton = document.createElement("button");
  addButton.className = "primary-button";
  addButton.type = "submit";
  addButton.textContent = "Add Task";
  taskForm.append(input, addButton);
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addGoalTask(goal.id, input.value);
  });

  card.append(header, progressWrap, progressText, taskList, taskForm);
  return card;
}

function createGoalTask(task) {
  const row = document.createElement("div");
  row.className = task.status === "completed" ? "goal-task done" : "goal-task";

  const toggle = document.createElement("button");
  toggle.className = task.status === "completed" ? "goal-task-check active" : "goal-task-check";
  toggle.type = "button";
  toggle.textContent = task.status === "completed" ? "\u2713" : "";
  toggle.addEventListener("click", () => toggleGoalTask(task.id));

  const title = document.createElement("span");
  title.textContent = task.title;

  const remove = document.createElement("button");
  remove.className = "goal-task-delete";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => deleteGoalTask(task.id));

  const schedule = document.createElement("button");
  schedule.className = "goal-task-schedule";
  schedule.type = "button";
  schedule.textContent = "Schedule";
  schedule.addEventListener("click", () => scheduleGoalTask(task.id));

  row.append(toggle, title, schedule, remove);
  return row;
}

function createEmptyState() {
  const empty = document.createElement("p");
  empty.className = "goal-empty";
  empty.textContent = "No goals yet. Add a long-term goal and break it into smaller tasks.";

  return empty;
}

function getGoalProgress(tasks) {
  if (tasks.length === 0) {
    return 0;
  }

  const done = tasks.filter((task) => task.status === "completed").length;
  return Math.round((done / tasks.length) * 100);
}

function formatDeadline(deadline) {
  const daysUntil = getDaysUntil(deadline);

  if (daysUntil === null) {
    return "No deadline";
  }

  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)} days overdue`;
  }

  if (daysUntil === 0) {
    return "Due today";
  }

  return `${daysUntil} days left`;
}

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent("app:data-changed", { detail: { source: "goals" } }));
}
