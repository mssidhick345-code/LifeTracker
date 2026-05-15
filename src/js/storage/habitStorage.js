const STORAGE_KEY = "lifetrack:habits";

export function loadHabits() {
  const rawHabits = localStorage.getItem(STORAGE_KEY);

  if (!rawHabits) {
    return [];
  }

  try {
    const habits = JSON.parse(rawHabits);
    return Array.isArray(habits) ? habits : [];
  } catch {
    return [];
  }
}

export function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}
