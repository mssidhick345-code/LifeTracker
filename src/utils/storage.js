import { debugError, debugLog, debugWarn } from "./debug.js";

const APP_STORAGE_KEY = "lifetrack:data";

const defaultData = {
  tasks: [],
  goals: [],
  schedule: [],
  habits: [],
  analytics: {},
};

export function getAppData() {
  const storedData = readStructuredData();

  if (storedData) {
    const shouldMigrateLegacy = !storedData.analytics?.legacyMigrated;
    const normalizedData = normalizeData(storedData, shouldMigrateLegacy);
    normalizedData.analytics = { ...normalizedData.analytics, legacyMigrated: true };
    writeAppData(normalizedData);
    debugLog("storage", "Read app data", getDataSummary(normalizedData));
    return normalizedData;
  }

  const migratedData = normalizeData({
    ...defaultData,
    tasks: migrateLegacyTasks(),
  }, true);
  migratedData.analytics = { ...migratedData.analytics, legacyMigrated: true };

  saveAppData(migratedData);
  debugLog("storage", "Initialized app data", getDataSummary(migratedData));
  return migratedData;
}

export function saveAppData(data) {
  const normalizedData = normalizeData(data, false);
  writeAppData(normalizedData);
  debugLog("storage", "Saved app data", getDataSummary(normalizedData));
}

export function updateAppData(updater) {
  try {
    const currentData = getAppData();
    const nextData = updater(currentData);
    saveAppData(nextData);

    return getAppData();
  } catch (error) {
    debugError("storage", "Failed to update app data", error);
    window.alert("Something went wrong while saving. Check the console for details.");
    return getAppData();
  }
}

function readStructuredData() {
  const rawData = localStorage.getItem(APP_STORAGE_KEY);

  if (!rawData) {
    return null;
  }

  try {
    return JSON.parse(rawData);
  } catch (error) {
    debugError("storage", "Invalid structured localStorage JSON", error);
    return null;
  }
}

function normalizeData(data, includeLegacy = false) {
  const tasks = ensureUniqueTaskIds(Array.isArray(data.tasks) ? data.tasks : []);
  const goals = includeLegacy
    ? mergeById(Array.isArray(data.goals) ? data.goals : [], migrateLegacyGoals())
    : Array.isArray(data.goals)
      ? data.goals
      : [];
  const habits = includeLegacy
    ? mergeById(Array.isArray(data.habits) ? data.habits : [], migrateLegacyHabits())
    : Array.isArray(data.habits)
      ? data.habits
      : [];

  return {
    tasks,
    goals,
    schedule: normalizeSchedule(Array.isArray(data.schedule) ? data.schedule : loadScheduleKey()),
    habits: habits.map(normalizeHabit),
    analytics: data.analytics && typeof data.analytics === "object" ? data.analytics : {},
  };
}

function ensureUniqueTaskIds(tasks) {
  const seenIds = new Set();

  return tasks.map((task) => {
    let id = task.id || createId("task");

    if (seenIds.has(id)) {
      debugWarn("storage", "Duplicate task id replaced", { oldId: id });
      id = createId("task");
    }

    seenIds.add(id);

    return { ...task, id };
  });
}

function normalizeSchedule(schedule) {
  return schedule
    .filter((entry) => {
      const isValid = Boolean(entry.taskId);

      if (!isValid) {
        debugWarn("storage", "Dropped schedule entry without taskId", entry);
      }

      return isValid;
    })
    .map((entry) => ({
      id: entry.id || createId("schedule"),
      taskId: entry.taskId,
      time: entry.time || entry.startTime || "",
      date: entry.date || "",
    }));
}

function loadScheduleKey() {
  const rawSchedule = localStorage.getItem("schedule");

  if (!rawSchedule) {
    return [];
  }

  try {
    const schedule = JSON.parse(rawSchedule);
    return Array.isArray(schedule) ? schedule : [];
  } catch (error) {
    debugError("storage", "Invalid schedule localStorage JSON", error);
    return [];
  }
}

function syncScheduleStorage(schedule) {
  try {
    localStorage.setItem("schedule", JSON.stringify(schedule));
  } catch (error) {
    debugError("storage", "Failed to sync schedule key", error);
  }
}

function writeAppData(data) {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
    syncScheduleStorage(data.schedule);
  } catch (error) {
    debugError("storage", "Failed to write app data", error);
    throw error;
  }
}

function mergeById(primary, fallback) {
  const seenIds = new Set(primary.map((item) => item.id));
  return [...primary, ...fallback.filter((item) => !seenIds.has(item.id))];
}

function migrateLegacyGoals() {
  const rawGoals = localStorage.getItem("lifetrack:goals");

  if (!rawGoals) {
    return [];
  }

  try {
    const goals = JSON.parse(rawGoals);

    if (!Array.isArray(goals)) {
      return [];
    }

    return goals.map((goal) => ({
      id: goal.id || createId("goal"),
      title: goal.title || "Untitled goal",
      deadline: goal.deadline || "",
      createdAt: goal.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    debugError("storage", "Invalid legacy goals JSON", error);
    return [];
  }
}

function migrateLegacyHabits() {
  const rawHabits = localStorage.getItem("lifetrack:habits");

  if (!rawHabits) {
    return [];
  }

  try {
    const habits = JSON.parse(rawHabits);

    if (!Array.isArray(habits)) {
      return [];
    }

    return habits.map(normalizeHabit);
  } catch (error) {
    debugError("storage", "Invalid legacy habits JSON", error);
    return [];
  }
}

function normalizeHabit(habit) {
  const history = habit.history && typeof habit.history === "object" ? habit.history : {};

  return {
    id: habit.id || createId("habit"),
    name: habit.name || "Untitled habit",
    streak: Number(habit.streak) || 0,
    history,
    createdAt: habit.createdAt || new Date().toISOString(),
  };
}

function migrateLegacyTasks() {
  const rawTasks = localStorage.getItem("lifetrack:tasks");

  if (!rawTasks) {
    return [];
  }

  try {
    const tasks = JSON.parse(rawTasks);

    if (!Array.isArray(tasks)) {
      return [];
    }

    return tasks.map((task) => ({
      id: task.id || createId("task"),
      title: task.title || "Untitled task",
      description: task.note || task.description || "",
      priority: task.priority || "medium",
      status: task.completed ? "completed" : "pending",
      goalId: task.goalId || null,
      metrics: task.metrics || null,
      createdAt: task.createdAt || new Date().toISOString(),
      completedAt: task.completedAt || null,
    }));
  } catch (error) {
    debugError("storage", "Invalid legacy tasks JSON", error);
    return [];
  }
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDataSummary(data) {
  return {
    tasks: data.tasks.length,
    goals: data.goals.length,
    schedule: data.schedule.length,
    habits: data.habits.length,
  };
}
