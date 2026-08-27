/**
 * Android Native Capacitor Haptic Feedback Engine
 * Bridges to Android OS Vibrator via @capacitor/haptics with native precision & fallback.
 */
import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const Haptics = {
  /** Subtle selection tick for tab switches, navigation, chips */
  selection: async () => {
    try {
      await CapHaptics.selectionStart();
      await CapHaptics.selectionChanged();
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(8);
        } catch {}
      }
    }
  },

  /** Light impact for buttons, checkbox toggles, increments */
  light: async () => {
    try {
      await CapHaptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(14);
        } catch {}
      }
    }
  },

  /** Medium impact for modal openings, active timer start */
  medium: async () => {
    try {
      await CapHaptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(20);
        } catch {}
      }
    }
  },

  /** Success haptic pattern for saving records, completing sprint, milestone unlocked */
  success: async () => {
    try {
      await CapHaptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([12, 40, 18]);
        } catch {}
      }
    }
  },

  /** Warning / alert pattern for deletions, urge reset, error states */
  warning: async () => {
    try {
      await CapHaptics.notification({ type: NotificationType.Warning });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([25, 50, 25]);
        } catch {}
      }
    }
  },

  /** Heavy vibration for timer completion / sprint alarms */
  alarm: async () => {
    try {
      await CapHaptics.vibrate({ duration: 400 });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([100, 80, 100, 80, 150]);
        } catch {}
      }
    }
  },
};
