export function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateKey(value) {
  return value || getTodayKey();
}

export function addDays(dateKey, offset) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offset);

  return toDateKey(date);
}

export function getRecentDateKeys(count) {
  const todayKey = getTodayKey();
  const dates = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    dates.push(addDays(todayKey, -index));
  }

  return dates;
}

export function getDaysUntil(dateKey) {
  if (!dateKey) {
    return null;
  }

  const today = new Date(`${getTodayKey()}T00:00:00`);
  const deadline = new Date(`${dateKey}T00:00:00`);
  const diff = deadline.getTime() - today.getTime();

  return Math.ceil(diff / 86400000);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
