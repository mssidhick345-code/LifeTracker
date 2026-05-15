import { loadDayPlan, saveDayPlan } from "../storage/plannerStorage.js";
import { formatDateKey, getTodayKey } from "../utils/date.js";

const START_HOUR = 5;
const END_HOUR = 23;
const STEP_MINUTES = 15;
const DEFAULT_DURATION_MINUTES = 60;

const plannerGrid = document.querySelector("#planner-grid");
const dateInput = document.querySelector("#planner-date");
const scheduledCount = document.querySelector("#scheduled-count");
const completedCount = document.querySelector("#completed-count");
const openCount = document.querySelector("#open-count");
const addBlockButton = document.querySelector("#add-block");
const clearDayButton = document.querySelector("#clear-day");

let selectedDateKey = getTodayKey();
let dayPlan = [];

export function initPlanner() {
  dateInput.value = selectedDateKey;
  dayPlan = getDayPlan(selectedDateKey);
  renderPlanner();

  dateInput.addEventListener("change", handleDateChange);
  addBlockButton.addEventListener("click", addBlock);
  clearDayButton.addEventListener("click", clearCurrentDay);
}

function handleDateChange(event) {
  selectedDateKey = formatDateKey(event.target.value);
  dayPlan = getDayPlan(selectedDateKey);
  renderPlanner();
}

function clearCurrentDay() {
  dayPlan = createDefaultPlan();
  saveDayPlan(selectedDateKey, dayPlan);
  renderPlanner();
}

function renderPlanner() {
  plannerGrid.innerHTML = "";

  dayPlan.forEach((block) => {
    plannerGrid.appendChild(createPlannerRow(block));
  });

  updateStats();
}

function createPlannerRow(block) {
  const row = document.createElement("article");
  row.className = "planner-row";

  const timeControls = document.createElement("div");
  timeControls.className = "time-controls";

  const startInput = document.createElement("input");
  startInput.className = "time-input";
  startInput.type = "time";
  startInput.value = minutesToInputValue(block.startMinutes);
  startInput.ariaLabel = "Start time";
  startInput.addEventListener("change", (event) =>
    updateBlock(block.id, { startMinutes: inputValueToMinutes(event.target.value) }, true),
  );

  const timeRange = document.createElement("span");
  timeRange.className = "time-label";
  timeRange.textContent = formatTimeRange(block);

  timeControls.append(startInput, timeRange);

  const textarea = document.createElement("textarea");
  textarea.className = "plan-input";
  textarea.placeholder = "Add a plan, task, workout, break...";
  textarea.value = block.text;
  textarea.rows = 2;
  textarea.ariaLabel = `Plan for ${formatTimeRange(block)}`;
  textarea.addEventListener("input", (event) => updateBlock(block.id, { text: event.target.value }));

  const durationControls = document.createElement("div");
  durationControls.className = "duration-controls";

  const increaseButton = createIconButton("Increase duration", "\u25B2", () =>
    updateBlock(block.id, { durationMinutes: block.durationMinutes + STEP_MINUTES }, true),
  );

  const durationLabel = document.createElement("span");
  durationLabel.className = "duration-label";
  durationLabel.textContent = `${block.durationMinutes} min`;

  const decreaseButton = createIconButton("Decrease duration", "\u25BC", () =>
    updateBlock(block.id, { durationMinutes: Math.max(STEP_MINUTES, block.durationMinutes - STEP_MINUTES) }, true),
  );

  durationControls.append(increaseButton, durationLabel, decreaseButton);

  const doneButton = document.createElement("button");
  doneButton.className = block.done ? "done-toggle active" : "done-toggle";
  doneButton.type = "button";
  doneButton.textContent = block.done ? "Done" : "Open";
  doneButton.ariaPressed = String(block.done);
  doneButton.addEventListener("click", () => updateBlock(block.id, { done: !block.done }, true));

  const deleteButton = createIconButton("Delete block", "Delete", () => deleteBlock(block.id));
  deleteButton.classList.add("delete-button");

  row.append(timeControls, textarea, durationControls, doneButton, deleteButton);
  return row;
}

function updateBlock(blockId, patch, shouldRender = false) {
  dayPlan = dayPlan.map((block) =>
    block.id === blockId ? normalizeBlock({ ...block, ...patch }) : block,
  );

  saveDayPlan(selectedDateKey, dayPlan);

  if (shouldRender) {
    renderPlanner();
    return;
  }

  updateStats();
}

function addBlock() {
  const lastBlock = dayPlan.at(-1);
  const startMinutes = lastBlock
    ? lastBlock.startMinutes + lastBlock.durationMinutes
    : START_HOUR * 60;

  dayPlan = [
    ...dayPlan,
    normalizeBlock({
      id: createBlockId(),
      startMinutes: Math.min(startMinutes, 23 * 60 + 45),
      durationMinutes: DEFAULT_DURATION_MINUTES,
      text: "",
      done: false,
    }),
  ];

  saveDayPlan(selectedDateKey, dayPlan);
  renderPlanner();
}

function deleteBlock(blockId) {
  dayPlan = dayPlan.filter((block) => block.id !== blockId);
  saveDayPlan(selectedDateKey, dayPlan);
  renderPlanner();
}

function updateStats() {
  const blocks = dayPlan;
  const scheduled = blocks.filter((block) => block.text.trim()).length;
  const completed = blocks.filter((block) => block.text.trim() && block.done).length;

  scheduledCount.textContent = blocks.length;
  completedCount.textContent = completed;
  openCount.textContent = Math.max(scheduled - completed, 0);
}

function getDayPlan(dateKey) {
  const savedPlan = loadDayPlan(dateKey);

  if (Array.isArray(savedPlan)) {
    return savedPlan.map(normalizeBlock);
  }

  const migratedPlan = migrateLegacyPlan(savedPlan);

  if (migratedPlan.length > 0) {
    saveDayPlan(dateKey, migratedPlan);
    return migratedPlan;
  }

  const defaultPlan = createDefaultPlan();
  saveDayPlan(dateKey, defaultPlan);
  return defaultPlan;
}

function createDefaultPlan() {
  const blocks = [];

  for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
    blocks.push(
      normalizeBlock({
        id: `default-${hour}`,
        startMinutes: hour * 60,
        durationMinutes: DEFAULT_DURATION_MINUTES,
        text: "",
        done: false,
      }),
    );
  }

  return blocks;
}

function migrateLegacyPlan(savedPlan) {
  if (!savedPlan || typeof savedPlan !== "object") {
    return [];
  }

  return Object.entries(savedPlan).map(([hour, block]) =>
    normalizeBlock({
      id: `legacy-${hour}`,
      startMinutes: Number(hour) * 60,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      text: block.text ?? "",
      done: Boolean(block.done),
    }),
  );
}

function normalizeBlock(block) {
  return {
    id: block.id || createBlockId(),
    startMinutes: clampMinutes(Number(block.startMinutes) || START_HOUR * 60),
    durationMinutes: Math.max(STEP_MINUTES, Number(block.durationMinutes) || DEFAULT_DURATION_MINUTES),
    text: block.text ?? "",
    done: Boolean(block.done),
  };
}

function createIconButton(label, text, onClick) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.textContent = text;
  button.ariaLabel = label;
  button.title = label;
  button.addEventListener("click", onClick);

  return button;
}

function createBlockId() {
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTimeRange(block) {
  return `${minutesToReadableTime(block.startMinutes)} - ${minutesToReadableTime(
    block.startMinutes + block.durationMinutes,
  )}`;
}

function minutesToInputValue(minutes) {
  const safeMinutes = clampMinutes(minutes);
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const mins = String(safeMinutes % 60).padStart(2, "0");

  return `${hours}:${mins}`;
}

function inputValueToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);

  return clampMinutes(hours * 60 + minutes);
}

function minutesToReadableTime(totalMinutes) {
  const minutesInDay = 24 * 60;
  const safeMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const date = new Date();
  date.setHours(Math.floor(safeMinutes / 60), safeMinutes % 60, 0, 0);

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function clampMinutes(minutes) {
  return Math.min(Math.max(minutes, 0), 23 * 60 + 45);
}
