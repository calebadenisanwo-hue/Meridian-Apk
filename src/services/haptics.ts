/**
 * Android Native Capacitor Haptic Feedback Engine
 * Disabled by default / made completely non-blocking to keep UI interactions instant & snappy.
 */
import { MeridianStorage } from './storage';

export const Haptics = {
  /** Check if haptics are active (default is disabled/off) */
  isEnabled: () => {
    try {
      const cfg = MeridianStorage.getPowerSettings();
      return cfg.hapticsIntensity !== 'off';
    } catch {
      return false;
    }
  },

  /** Subtle selection tick (no-op unless explicitly enabled in settings) */
  selection: async () => {
    // No-op for maximum UI snappiness
  },

  /** Light impact for buttons, checkbox toggles */
  light: async () => {
    // No-op for maximum UI snappiness
  },

  /** Medium impact */
  medium: async () => {
    // No-op for maximum UI snappiness
  },

  /** Success haptic pattern */
  success: async () => {
    // No-op for maximum UI snappiness
  },

  /** Warning / alert pattern */
  warning: async () => {
    // No-op for maximum UI snappiness
  },

  /** Alarm pattern */
  alarm: async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 80, 100]);
      } catch {}
    }
  },
};
