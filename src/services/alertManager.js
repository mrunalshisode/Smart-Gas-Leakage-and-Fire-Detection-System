/**
 * alertManager.js
 * Modular service for alert deduplication and cooldown tracking per device and alertType.
 */

// In-memory state tracking per deviceId
// Structure: Map<deviceId, { lastAlertTimestamps: { [alertType]: number }, inHazard: boolean, activeAlertType: string | null }>
const deviceAlertStates = new Map();

// Default cooldown duration (60 seconds, configurable via ALERT_COOLDOWN_SECONDS)
const getCooldownDurationMs = () => {
  const seconds = Number(process.env.ALERT_COOLDOWN_SECONDS) || 60;
  return seconds * 1000;
};

/**
 * Retrieves or initializes the state for a given deviceId
 */
const getDeviceState = (deviceId) => {
  if (!deviceAlertStates.has(deviceId)) {
    deviceAlertStates.set(deviceId, {
      lastAlertTimestamps: {},
      inHazard: false,
      activeAlertType: null,
    });
  }
  return deviceAlertStates.get(deviceId);
};

/**
 * Determines whether an alert should be created and dispatched for a device.
 *
 * Rules:
 * 1. If reading is NOT hazardous, resets inHazard state (allowing immediate alert if hazard returns).
 * 2. If reading IS hazardous:
 *    - If hazard returns after a normal state (inHazard was false), triggers immediately.
 *    - If hazard is ongoing with the same alertType, enforces a 60-second cooldown.
 *    - If hazard escalates to a different alertType (e.g. GAS_LEAK -> COMBINED_HAZARD), checks cooldown for the new alertType.
 *
 * @param {string} deviceId - Hardware device identifier
 * @param {string} alertType - 'GAS_LEAK' | 'FIRE_DETECTED' | 'COMBINED_HAZARD'
 * @param {boolean} isHazardous - Whether the current reading breached thresholds
 * @returns {boolean} - true if alert should be created, false if suppressed as duplicate
 */
const shouldTriggerAlert = (deviceId, alertType, isHazardous) => {
  const state = getDeviceState(deviceId);
  const now = Date.now();
  const cooldownMs = getCooldownDurationMs();

  // If the reading is normal (safe):
  if (!isHazardous) {
    if (state.inHazard) {
      console.log(`[AlertManager] Device ${deviceId} returned to NORMAL state. Hazard cleared.`);
    }
    state.inHazard = false;
    state.activeAlertType = null;
    return false;
  }

  // Reading IS hazardous:
  // Case A: Fresh incident (hazard just returned after a normal state)
  if (!state.inHazard) {
    state.inHazard = true;
    state.activeAlertType = alertType;
    state.lastAlertTimestamps[alertType] = now;
    console.log(`[AlertManager] NEW incident onset for ${deviceId}: [${alertType}]. Alert permitted.`);
    return true;
  }

  // Case B: Ongoing hazard
  const lastAlertTime = state.lastAlertTimestamps[alertType] || 0;
  const elapsedMs = now - lastAlertTime;

  if (elapsedMs < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
    console.log(`[AlertManager] Duplicate alert suppressed for ${deviceId} [${alertType}]. In cooldown (${remainingSec}s remaining).`);
    return false;
  }

  // Cooldown has elapsed for this alertType during persistent hazard -> allow reminder alert
  state.activeAlertType = alertType;
  state.lastAlertTimestamps[alertType] = now;
  console.log(`[AlertManager] Cooldown elapsed for ${deviceId} [${alertType}]. Ongoing hazard alert permitted.`);
  return true;
};

/**
 * Resets all device states (useful for automated testing)
 */
const resetAlertStates = () => {
  deviceAlertStates.clear();
};

/**
 * Gets the current internal state map (for diagnostics / testing)
 */
const getAlertStates = () => {
  return deviceAlertStates;
};

module.exports = {
  shouldTriggerAlert,
  resetAlertStates,
  getAlertStates,
};
