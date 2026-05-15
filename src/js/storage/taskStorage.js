const STORAGE_KEY = "lifetrack:tasks";

export function loadTasks() {
  const rawTasks = localStorage.getItem(STORAGE_KEY);

  if (!rawTasks) {
    return [];
  }

  try {
    const tasks = JSON.parse(rawTasks);
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
