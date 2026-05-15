const DEBUG_ENABLED = true;

export function debugLog(scope, message, data = null) {
  if (!DEBUG_ENABLED) {
    return;
  }

  if (data === null) {
    console.log(`[LifeTrack:${scope}] ${message}`);
    return;
  }

  console.log(`[LifeTrack:${scope}] ${message}`, data);
}

export function debugWarn(scope, message, data = null) {
  if (data === null) {
    console.warn(`[LifeTrack:${scope}] ${message}`);
    return;
  }

  console.warn(`[LifeTrack:${scope}] ${message}`, data);
}

export function debugError(scope, message, error) {
  console.error(`[LifeTrack:${scope}] ${message}`, error);
}
