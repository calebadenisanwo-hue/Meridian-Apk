/**
 * Native Android Hardware & OS Integration Services
 * Leverages Capacitor Android plugins & Offline Web Audio Engine
 */
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Device, DeviceInfo, BatteryInfo } from '@capacitor/device';
import { Network, ConnectionStatus } from '@capacitor/network';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Haptics } from './haptics';

export interface AndroidSystemStatus {
  model: string;
  osVersion: string;
  platform: string;
  isVirtual: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
  isOnline: boolean;
  connectionType: string;
}

class NativeAndroidService {
  private audioCtx: AudioContext | null = null;
  private activeNoiseNode: AudioNode | null = null;

  // Initialize Audio Context lazily on user gesture
  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // ==========================================
  // 1. LOCAL ANDROID NOTIFICATIONS
  // ==========================================
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return false;
    }
  }

  async scheduleDailyReminder(hour: number = 20, minute: number = 0): Promise<boolean> {
    try {
      await this.requestNotificationPermissions();
      // Cancel previous daily reminder (id: 101)
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
      } catch {}

      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, minute, 0, 0);
      if (scheduledTime.getTime() <= now.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🌿 Meridian Evening Check-in',
            body: 'Time to record your daily pulse, review goals, and log today\'s highlights.',
            id: 101,
            schedule: {
              at: scheduledTime,
              repeats: true,
              every: 'day',
            },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: { route: 'checkin' },
          },
        ],
      });
      Haptics.success();
      return true;
    } catch (e) {
      console.warn('Local notification schedule fallback:', e);
      return false;
    }
  }

  async scheduleTimerFinishedNotification(title: string, body: string, delaySeconds: number): Promise<void> {
    try {
      await this.requestNotificationPermissions();
      const atTime = new Date(Date.now() + delaySeconds * 1000);
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() % 100000),
            schedule: { at: atTime },
            sound: 'alarm.wav',
            extra: { route: 'study' },
          },
        ],
      });
    } catch (e) {
      console.warn('Timer notification error:', e);
    }
  }

  // ==========================================
  // 2. NATIVE ANDROID SYSTEM SHARE & BACKUP
  // ==========================================
  async shareContent(title: string, text: string, url?: string): Promise<boolean> {
    try {
      Haptics.selection();
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title,
          text,
          url: url || undefined,
          dialogTitle: 'Share via Android',
        });
        return true;
      }
    } catch {
      // Web Share API fallback
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return true;
        } catch {}
      }
    }

    // Fallback: Copy to clipboard
    return this.copyToClipboard(text, 'Content copied to Android clipboard!');
  }

  /**
   * Seamless Android System Storage & Google Drive Integration:
   * Uses Android's native Share Sheet (offering "Save to Drive", "Files", etc.)
   * or File System Access API without requiring any OAuth Client ID or configuration.
   */
  async shareOrSaveBackupFile(
    jsonString: string,
    filename: string = `meridian-backup-${new Date().toISOString().slice(0, 10)}.json`
  ): Promise<{ success: boolean; method: 'share' | 'file-system' | 'download'; message: string }> {
    Haptics.selection();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    // 1. Android Native System Share (Invokes "Save to Drive", "Files", etc.)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Meridian Backup File',
          text: 'Offline Database Backup for Meridian Personal OS',
          files: [file],
        });
        Haptics.success();
        return {
          success: true,
          method: 'share',
          message: 'Saved/Shared via Android System (Google Drive, Files, etc.)',
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: true, method: 'share', message: 'Share sheet dismissed.' };
        }
      }
    }

    // 2. Modern File System Access API (Chromium / Desktop / Chrome OS)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'JSON Database Backup',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        Haptics.success();
        return {
          success: true,
          method: 'file-system',
          message: `Saved backup directly to selected storage folder.`,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: true, method: 'file-system', message: 'Save cancelled.' };
        }
      }
    }

    // 3. Fallback: Instant File Download
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Haptics.success();
      return {
        success: true,
        method: 'download',
        message: `Saved ${filename} to your device downloads.`,
      };
    } catch (e: any) {
      return {
        success: false,
        method: 'download',
        message: `Failed to save file: ${e.message}`,
      };
    }
  }

  // ==========================================
  // 3. CLIPBOARD INTEGRATION
  // ==========================================
  async copyToClipboard(text: string, _feedbackLabel?: string): Promise<boolean> {
    try {
      await Clipboard.write({ string: text });
      Haptics.success();
      return true;
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        Haptics.success();
        return true;
      } catch {
        return false;
      }
    }
  }

  async readFromClipboard(): Promise<string> {
    try {
      const { value } = await Clipboard.read();
      return value || '';
    } catch {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    }
  }

  // ==========================================
  // 4. DEVICE & SYSTEM METRICS
  // ==========================================
  async getSystemStatus(): Promise<AndroidSystemStatus> {
    let devInfo: Partial<DeviceInfo> = {};
    let battInfo: Partial<BatteryInfo> = {};
    let netStatus: Partial<ConnectionStatus> = { connected: true, connectionType: 'wifi' };

    try {
      devInfo = await Device.getInfo();
    } catch {}
    try {
      battInfo = await Device.getBatteryInfo();
    } catch {}
    try {
      netStatus = await Network.getStatus();
    } catch {}

    return {
      model: devInfo.model || 'Android Device',
      osVersion: devInfo.osVersion || 'Android 14',
      platform: devInfo.platform || 'android',
      isVirtual: Boolean(devInfo.isVirtual),
      batteryLevel: battInfo.batteryLevel !== undefined ? Math.round(battInfo.batteryLevel * 100) : undefined,
      isCharging: battInfo.isCharging,
      isOnline: netStatus.connected ?? true,
      connectionType: netStatus.connectionType || 'cellular',
    };
  }

  // ==========================================
  // 5. SCREEN ORIENTATION & KEEP AWAKE
  // ==========================================
  async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation });
    } catch {}
  }

  async unlockOrientation(): Promise<void> {
    try {
      await ScreenOrientation.unlock();
    } catch {}
  }

  // ==========================================
  // 6. SYNTHESIZED TONE & FOCUS AMBIENCE (100% Offline)
  // ==========================================
  playChime(frequency: number = 528, duration: number = 1.2): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      // Soft harmonic overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      gain2.gain.setValueAtTime(0.08, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration * 0.7);

      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc.start();
      osc2.start();
      osc.stop(ctx.currentTime + duration);
      osc2.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio chime note:', e);
    }
  }

  playTibetanBowl(): void {
    this.playChime(216, 2.5); // Warm grounding frequency
  }

  playMilestoneCelebration(): void {
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        setTimeout(() => {
          this.playChime(freq, 0.6);
        }, i * 110);
      });
    } catch {}
  }

  startFocusNoise(type: 'binaural' | 'rain' = 'binaural'): void {
    this.stopFocusNoise();
    try {
      const ctx = this.getAudioContext();
      if (type === 'binaural') {
        // Binaural Theta Beat (432Hz base, 438Hz left/right for 6Hz theta relaxation)
        const leftOsc = ctx.createOscillator();
        const rightOsc = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);
        const masterGain = ctx.createGain();

        leftOsc.type = 'sine';
        leftOsc.frequency.setValueAtTime(432, ctx.currentTime);

        rightOsc.type = 'sine';
        rightOsc.frequency.setValueAtTime(438, ctx.currentTime);

        masterGain.gain.setValueAtTime(0.12, ctx.currentTime);

        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);
        merger.connect(masterGain);
        masterGain.connect(ctx.destination);

        leftOsc.start();
        rightOsc.start();
        this.activeNoiseNode = masterGain;
      }
    } catch (e) {
      console.warn('Focus noise error:', e);
    }
  }

  stopFocusNoise(): void {
    if (this.activeNoiseNode) {
      try {
        if (this.audioCtx) {
          (this.activeNoiseNode as any).gain?.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.5);
          setTimeout(() => {
            this.activeNoiseNode?.disconnect();
            this.activeNoiseNode = null;
          }, 500);
        }
      } catch {
        this.activeNoiseNode = null;
      }
    }
  }
}

export const NativeAndroid = new NativeAndroidService();
