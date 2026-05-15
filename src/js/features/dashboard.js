import { getAppData } from "../../utils/storage.js";
import { debugLog, debugWarn } from "../../utils/debug.js";
import { addDays, getRecentDateKeys, getTodayKey } from "../utils/date.js";

const tasksCompleted = document.querySelector("#dashboard-tasks-completed");
const bestStreak = document.querySelector("#dashboard-best-streak");
const productivityScore = document.querySelector("#dashboard-productivity-score");
const streakList = document.querySelector("#dashboard-habit-streaks");
const chartCanvas = document.querySelector("#weekly-progress-chart");

export function initDashboard() {
  debugLog("dashboard", "Initializing dashboard");
  renderDashboard();
}

export function renderDashboard() {
  if (!chartCanvas) {
    debugWarn("dashboard", "Dashboard render skipped: missing chart canvas");
    return;
  }

  const appData = getAppData();
  const completedTasks = appData.tasks.filter((task) => task.status === "completed").length;
  const streaks = appData.habits.map((habit) => ({
    name: habit.name,
    streak: getStreakCount(habit),
  }));

  debugLog("dashboard", "Rendering dashboard", {
    tasks: appData.tasks.length,
    completedTasks,
    habits: appData.habits.length,
    schedule: appData.schedule.length,
  });

  tasksCompleted.textContent = completedTasks;
  bestStreak.textContent = Math.max(0, ...streaks.map((habit) => habit.streak));
  productivityScore.textContent = `${getProductivityScore(appData)}%`;

  renderStreakList(streaks);
  drawWeeklyChart(getWeeklyProgress(appData));
}

function renderStreakList(streaks) {
  streakList.innerHTML = "";

  if (streaks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty";
    empty.textContent = "No habit streaks yet.";
    streakList.appendChild(empty);
    return;
  }

  streaks
    .sort((left, right) => right.streak - left.streak)
    .forEach((habit) => {
      const row = document.createElement("div");
      row.className = "dashboard-list-row";

      const name = document.createElement("span");
      name.textContent = habit.name;

      const streak = document.createElement("strong");
      streak.textContent = `${habit.streak} days`;

      row.append(name, streak);
      streakList.appendChild(row);
    });
}

function getProductivityScore(appData) {
  const todayKey = getTodayKey();
  const taskScore =
    appData.tasks.length === 0
      ? 0
      : appData.tasks.filter((task) => task.status === "completed").length / appData.tasks.length;
  const habitScore =
    appData.habits.length === 0
      ? 0
      : appData.habits.filter((habit) => habit.history[todayKey]).length / appData.habits.length;
  const todaySchedule = appData.schedule.filter((entry) => entry.date === todayKey);
  const scheduleScore =
    todaySchedule.length === 0
      ? 0
      : todaySchedule.filter((entry) => {
          const task = appData.tasks.find((item) => item.id === entry.taskId);
          return task?.status === "completed";
        }).length / todaySchedule.length;

  const activeScores = [taskScore, habitScore, scheduleScore].filter((score) => score > 0);

  if (activeScores.length === 0) {
    return 0;
  }

  return Math.round((activeScores.reduce((total, score) => total + score, 0) / activeScores.length) * 100);
}

function getWeeklyProgress(appData) {
  return getRecentDateKeys(7).map((dateKey) => {
    const habitDone = appData.habits.filter((habit) => habit.history[dateKey]).length;
    const scheduledDone = appData.schedule.filter((entry) => {
      const task = appData.tasks.find((item) => item.id === entry.taskId);
      return entry.date === dateKey && task?.status === "completed";
    }).length;

    return {
      dateKey,
      label: new Date(`${dateKey}T00:00:00`).toLocaleDateString([], { weekday: "short" }),
      value: habitDone + scheduledDone,
    };
  });
}

function drawWeeklyChart(data) {
  const context = chartCanvas.getContext("2d");
  const width = chartCanvas.clientWidth || chartCanvas.width;
  const height = Number(chartCanvas.getAttribute("height")) || 240;
  const pixelRatio = window.devicePixelRatio || 1;

  chartCanvas.width = width * pixelRatio;
  chartCanvas.height = height * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = 34;
  const chartHeight = height - padding * 2;
  const barWidth = Math.max(18, (width - padding * 2) / data.length - 12);
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.fillRect(padding, padding, width - padding * 2, chartHeight);

  data.forEach((item, index) => {
    const x = padding + index * (barWidth + 12) + 6;
    const barHeight = (item.value / maxValue) * (chartHeight - 20);
    const y = padding + chartHeight - barHeight;

    const gradient = context.createLinearGradient(0, y, 0, padding + chartHeight);
    gradient.addColorStop(0, "#52d6b5");
    gradient.addColorStop(1, "#86a8ff");

    context.fillStyle = gradient;
    roundRect(context, x, y, barWidth, barHeight, 7);
    context.fill();

    context.fillStyle = "#98a4b8";
    context.font = "12px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(item.label, x + barWidth / 2, height - 12);
    context.fillStyle = "#f4f7fb";
    context.fillText(String(item.value), x + barWidth / 2, y - 8);
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
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
