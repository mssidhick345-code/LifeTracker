import './dplanner.js';
import { initScheduler, renderSchedule } from "../modules/scheduler.js";
import { initTasks, refreshTasks, renderTasks } from "../modules/tasks.js";
import { initHabits, renderHabits } from "./features/habits.js";
import { initGoals, renderGoals } from "./features/goals.js";
import { initDashboard, renderDashboard } from "./features/dashboard.js";
import { debugLog, debugWarn } from "../utils/debug.js";

const viewLinks = document.querySelectorAll("[data-view-link]");
const views = document.querySelectorAll("[data-view]");

document.addEventListener("DOMContentLoaded", () => {
  debugLog("app", "Booting LifeTrack");
  initScheduler();
  initTasks();
  initHabits();
  initGoals();
  initDashboard();
  initNavigation();

  window.addEventListener("schedule:updated", () => {
    debugLog("app", "Schedule updated; switching to planner");
    showView("planner");
  });

  window.addEventListener("app:data-changed", (event) => {
    debugLog("app", "Data changed; rendering connected views", event.detail);
    renderCoreViews();
  });
});

function renderCoreViews() {
  renderTasks();
  renderSchedule();
  renderGoals();
  renderHabits();
  renderDashboard();
}

function initNavigation() {
  viewLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showView(link.dataset.viewLink);
    });
  });

  const initialView = window.location.hash.replace("#", "") || "planner";
  showView(initialView);
}

function showView(viewName) {
  const targetView = document.querySelector(`[data-view="${viewName}"]`);

  if (!targetView) {
    debugWarn("app", "Unknown view requested", { viewName });
    return;
  }

  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });

  viewLinks.forEach((link) => {
    const isActive = link.dataset.viewLink === viewName;
    link.classList.toggle("active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  window.history.replaceState(null, "", `#${viewName}`);

  if (viewName === "dashboard") {
    renderDashboard();
  }

  if (viewName === "tasks") {
    refreshTasks();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("Service Worker Registered");
      })
      .catch((err) => {
        console.log("Service Worker Failed:", err);
      });
  });
}