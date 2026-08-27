/**
 * Biometric Authentication Service for Android APK & Web Preview
 * Powered by @capgo/capacitor-native-biometric with WebAuthn / TouchID / Fingerprint / PIN fallback.
 */
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Haptics } from './haptics';
import { MeridianStorage } from './storage';
import { BiometricSecuritySettings } from '../types';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'multiple' | 'none';
  biometryName: string;
  hasHardware: boolean;
  isEnrolled: boolean;
}

class BiometricsService {
  private cachedStatus: BiometricStatus | null = null;
  private isUnlockedInCurrentSession: boolean = false;

  /**
   * Check if device supports Biometrics (Android Fingerprint / Face Unlock / WebAuthn)
   */
  async checkBiometricStatus(): Promise<BiometricStatus> {
    try {
      const result = await NativeBiometric.isAvailable({
        useFallback: true,
      });

      let type: BiometricStatus['biometryType'] = 'fingerprint';
      let name = 'Fingerprint / Biometrics';

      if (result.biometryType === BiometryType.FACE_AUTHENTICATION || result.biometryType === BiometryType.FACE_ID) {
        type = 'face';
        name = 'Face Unlock';
      } else if (result.biometryType === BiometryType.TOUCH_ID || result.biometryType === BiometryType.FINGERPRINT) {
        type = 'fingerprint';
        name = 'Fingerprint Sensor';
      } else if (result.biometryType === BiometryType.MULTIPLE) {
        type = 'multiple';
        name = 'Fingerprint or Face Unlock';
      } else if (result.biometryType === BiometryType.IRIS_AUTHENTICATION) {
        type = 'iris';
        name = 'Iris Scanner';
      } else if (!result.isAvailable) {
        type = 'none';
        name = 'No Biometric Hardware';
      }

      this.cachedStatus = {
        isAvailable: result.isAvailable,
        biometryType: type,
        biometryName: name,
        hasHardware: result.isAvailable || (result as any).hasHardware !== false,
        isEnrolled: result.isAvailable,
      };
      return this.cachedStatus;
    } catch (err) {
      console.warn('Native biometric check fallback:', err);
      // Check for WebAuthn in browser
      const hasWebAuthn = typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
      this.cachedStatus = {
        isAvailable: hasWebAuthn,
        biometryType: hasWebAuthn ? 'fingerprint' : 'none',
        biometryName: hasWebAuthn ? 'Biometrics / Passkey (Web)' : 'PIN Security',
        hasHardware: hasWebAuthn,
        isEnrolled: hasWebAuthn,
      };
      return this.cachedStatus;
    }
  }

  /**
   * Prompt user for Biometric Authentication
   */
  async authenticate(reason: string = 'Confirm identity to access Meridian records'): Promise<{ success: boolean; error?: string }> {
    try {
      Haptics.medium();
      const status = await this.checkBiometricStatus();

      if (status.isAvailable) {
        try {
          await NativeBiometric.verifyIdentity({
            reason: reason,
            title: 'Meridian Security',
            subtitle: 'Biometric Confirmation',
            description: reason,
            fallbackTitle: 'Use Device PIN / Password',
            maxAttempts: 3,
          });

          this.isUnlockedInCurrentSession = true;
          Haptics.success();
          return { success: true };
        } catch (nativeErr: any) {
          // If user cancelled or failed
          console.warn('NativeBiometric verify error:', nativeErr);
          Haptics.warning();
          return {
            success: false,
            error: nativeErr?.message || 'Biometric authentication was cancelled or failed.',
          };
        }
      }

      // Web fallback: Check PIN or WebAuthn if on browser
      const settings = MeridianStorage.getBiometricSettings();
      if (!settings.enabled) {
        this.isUnlockedInCurrentSession = true;
        return { success: true };
      }

      return { success: false, error: 'Biometric hardware unavailable' };
    } catch (e: any) {
      Haptics.warning();
      return { success: false, error: e?.message || 'Authentication error' };
    }
  }

  /**
   * Verify backup security PIN
   */
  verifyPIN(pin: string): boolean {
    const settings = MeridianStorage.getBiometricSettings();
    if (!settings.pinHash) {
      // Default backup PIN if not set is 1234
      const ok = pin === '1234';
      if (ok) {
        this.isUnlockedInCurrentSession = true;
        Haptics.success();
      } else {
        Haptics.warning();
      }
      return ok;
    }
    const ok = btoa(pin) === settings.pinHash;
    if (ok) {
      this.isUnlockedInCurrentSession = true;
      Haptics.success();
    } else {
      Haptics.warning();
    }
    return ok;
  }

  /**
   * Set or update backup PIN
   */
  setPIN(pin: string): void {
    const settings = MeridianStorage.getBiometricSettings();
    settings.pinHash = btoa(pin);
    settings.hasPINFallback = true;
    MeridianStorage.saveBiometricSettings(settings);
    Haptics.success();
  }

  /**
   * Check if the app currently requires unlock
   */
  get isSessionUnlocked(): boolean {
    return this.isUnlockedInCurrentSession;
  }

  isAppLocked(): boolean {
    const settings = MeridianStorage.getBiometricSettings();
    if (!settings.enabled) return false;
    if (!this.isUnlockedInCurrentSession) return true;
    return false;
  }

  /**
   * Lock the app session
   */
  lockSession(): void {
    this.isUnlockedInCurrentSession = false;
  }

  /**
   * Check if a specific module requires biometric verification
   */
  isModuleProtected(moduleRoute: string): boolean {
    const settings = MeridianStorage.getBiometricSettings();
    if (!settings.enabled || !settings.lockSensitiveModules) return false;
    const sensitive = ['journal', 'recovery', 'finance'];
    return sensitive.includes(moduleRoute);
  }
}

export const Biometrics = new BiometricsService();
