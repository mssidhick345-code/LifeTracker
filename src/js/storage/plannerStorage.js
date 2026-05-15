const STORAGE_PREFIX = "lifetrack:planner";

export function loadDayPlan(dateKey) {
  const rawPlan = localStorage.getItem(getStorageKey(dateKey));

  if (!rawPlan) {
    return {};
  }

  try {
    return JSON.parse(rawPlan);
  } catch {
    return {};
  }
}

export function saveDayPlan(dateKey, dayPlan) {
  localStorage.setItem(getStorageKey(dateKey), JSON.stringify(dayPlan));
}

export function loadPlannerHistory() {
  const plans = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key || !key.startsWith(`${STORAGE_PREFIX}:`)) {
      continue;
    }

    const dateKey = key.replace(`${STORAGE_PREFIX}:`, "");
    plans[dateKey] = loadDayPlan(dateKey);
  }

  return plans;
}

function getStorageKey(dateKey) {
  return `${STORAGE_PREFIX}:${dateKey}`;
}
