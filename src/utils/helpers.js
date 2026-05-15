export function clampScore(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  return Math.min(Math.max(Math.round(number), 1), 10);
}

export function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatTaskStatus(status) {
  return status === "completed" ? "Completed" : "Pending";
}
