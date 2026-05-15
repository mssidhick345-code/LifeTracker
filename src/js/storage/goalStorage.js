const STORAGE_KEY = "lifetrack:goals";

export function loadGoals() {
  const rawGoals = localStorage.getItem(STORAGE_KEY);

  if (!rawGoals) {
    return [];
  }

  try {
    const goals = JSON.parse(rawGoals);
    return Array.isArray(goals) ? goals : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}
