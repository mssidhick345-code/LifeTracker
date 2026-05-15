import { loadTasks, saveTasks } from "../storage/taskStorage.js";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const filterButtons = document.querySelectorAll("[data-task-filter]");
const totalCount = document.querySelector("#task-total-count");
const completedCount = document.querySelector("#task-completed-count");
const completionPercent = document.querySelector("#task-completion-percent");

let tasks = [];
let activeFilter = "all";

export function initTasks() {
  tasks = loadTasks();
  renderTasks();

  taskForm.addEventListener("submit", handleAddTask);
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.taskFilter));
  });
}

function handleAddTask(event) {
  event.preventDefault();

  const title = taskInput.value.trim();

  if (!title) {
    taskInput.focus();
    return;
  }

  tasks = [
    {
      id: createTaskId(),
      title,
      note: "",
      completed: false,
      createdAt: new Date().toISOString(),
    },
    ...tasks,
  ];

  taskInput.value = "";
  persistAndRender();
}

function setFilter(filter) {
  activeFilter = filter;
  renderTasks();
}

function toggleTask(taskId) {
  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task,
  );

  persistAndRender();
}

function updateTaskNote(taskId, note) {
  tasks = tasks.map((task) => (task.id === taskId ? { ...task, note } : task));
  saveTasks(tasks);
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  persistAndRender();
}

function persistAndRender() {
  saveTasks(tasks);
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";

  updateFilterButtons();
  updateStats();

  const visibleTasks = getVisibleTasks();

  if (visibleTasks.length === 0) {
    taskList.appendChild(createEmptyState());
    return;
  }

  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskRow(task));
  });
}

function createTaskRow(task) {
  const row = document.createElement("article");
  row.className = task.completed ? "task-row completed" : "task-row";

  const taskMain = document.createElement("div");
  taskMain.className = "task-main";

  const checkbox = document.createElement("button");
  checkbox.className = task.completed ? "task-check active" : "task-check";
  checkbox.type = "button";
  checkbox.ariaLabel = task.completed ? "Mark task as pending" : "Mark task as complete";
  checkbox.ariaPressed = String(task.completed);
  checkbox.textContent = task.completed ? "\u2713" : "";
  checkbox.addEventListener("click", () => toggleTask(task.id));

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.ariaLabel = `Delete ${task.title}`;
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  const note = document.createElement("textarea");
  note.className = "task-note";
  note.placeholder = "Add a status comment, completion note, blocker, or next step...";
  note.value = task.note ?? "";
  note.rows = 2;
  note.ariaLabel = `Note for ${task.title}`;
  note.addEventListener("input", (event) => updateTaskNote(task.id, event.target.value));

  taskMain.append(checkbox, title, deleteButton);
  row.append(taskMain, note);
  return row;
}

function createEmptyState() {
  const empty = document.createElement("p");
  empty.className = "task-empty";
  empty.textContent = "No tasks in this view.";

  return empty;
}

function getVisibleTasks() {
  if (activeFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  if (activeFilter === "pending") {
    return tasks.filter((task) => !task.completed);
  }

  return tasks;
}

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.taskFilter === activeFilter);
  });
}

function updateStats() {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const percent = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);

  totalCount.textContent = tasks.length;
  completedCount.textContent = completedTasks;
  completionPercent.textContent = `${percent}%`;
}

function createTaskId() {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
