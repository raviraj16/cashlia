import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App, AppState } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppLockService {
  private readonly PIN_KEY = 'pin';
  private readonly PIN_ENABLED_KEY = 'pin_enabled';
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly LOCK_AFTER_INACTIVITY_KEY = 'lock_after_inactivity';
  private readonly INACTIVITY_MINUTES_KEY = 'inactivity_minutes';
  private readonly LAST_ACTIVE_KEY = 'last_active_time';

  private isLocked$ = new BehaviorSubject<boolean>(false);
  private inactivityTimer: any = null;
  private lastActiveTime: number = Date.now();

  constructor(
    private router: Router,
    private platform: Platform
  ) {
    this.setupAppStateListener();
    this.setupInactivityMonitoring();
  }

  /**
   * Check if app should be locked
   */
  async shouldLock(): Promise<boolean> {
    const pinEnabled = await this.isPinEnabled();
    const lockAfterInactivity = await this.isLockAfterInactivityEnabled();

    if (!pinEnabled && !lockAfterInactivity) {
      return false;
    }

    if (lockAfterInactivity) {
      const lastActive = await this.getLastActiveTime();
      const inactivityMinutes = await this.getInactivityMinutes();
      const minutesSinceActive = (Date.now() - lastActive) / (1000 * 60);

      if (minutesSinceActive >= inactivityMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Lock the app
   */
  async lockApp(): Promise<void> {
    this.isLocked$.next(true);
    await this.router.navigate(['/app-lock']);
  }

  /**
   * Unlock the app with PIN
   */
  async unlockWithPin(pin: string): Promise<boolean> {
    const storedPin = await Preferences.get({ key: this.PIN_KEY });
    
    if (storedPin.value === pin) {
      this.isLocked$.next(false);
      await this.updateLastActiveTime();
      this.router.navigate(['/home']);
      return true;
    }

    return false;
  }

  /**
   * Unlock with biometric (placeholder - requires native plugin)
   */
  async unlockWithBiometric(): Promise<boolean> {
    const biometricEnabled = await this.isBiometricEnabled();
    
    if (!biometricEnabled) {
      return false;
    }

    // In production, use @capacitor-community/biometric or similar
    // For now, this is a placeholder
    try {
      // Simulate biometric check
      // In production: await Biometric.authenticate({ reason: 'Unlock Cashlia' });
      this.isLocked$.next(false);
      await this.updateLastActiveTime();
      this.router.navigate(['/home']);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if PIN is enabled
   */
  async isPinEnabled(): Promise<boolean> {
    const pref = await Preferences.get({ key: this.PIN_ENABLED_KEY });
    return pref.value === 'true';
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const pref = await Preferences.get({ key: this.BIOMETRIC_ENABLED_KEY });
    return pref.value === 'true';
  }

  /**
   * Check if lock after inactivity is enabled
   */
  async isLockAfterInactivityEnabled(): Promise<boolean> {
    const pref = await Preferences.get({ key: this.LOCK_AFTER_INACTIVITY_KEY });
    return pref.value === 'true';
  }

  /**
   * Get inactivity minutes setting
   */
  async getInactivityMinutes(): Promise<number> {
    const pref = await Preferences.get({ key: this.INACTIVITY_MINUTES_KEY });
    return pref.value ? parseInt(pref.value) : 5;
  }

  /**
   * Get last active time
   */
  async getLastActiveTime(): Promise<number> {
    const pref = await Preferences.get({ key: this.LAST_ACTIVE_KEY });
    return pref.value ? parseInt(pref.value) : Date.now();
  }

  /**
   * Update last active time
   */
  async updateLastActiveTime(): Promise<void> {
    this.lastActiveTime = Date.now();
    await Preferences.set({
      key: this.LAST_ACTIVE_KEY,
      value: this.lastActiveTime.toString()
    });
  }

  /**
   * Get lock status observable
   */
  getLockStatus(): Observable<boolean> {
    return this.isLocked$.asObservable();
  }

  /**
   * Setup app state listener
   */
  private setupAppStateListener(): void {
    App.addListener('appStateChange', async (state: AppState) => {
      if (state.isActive) {
        // App came to foreground
        await this.updateLastActiveTime();
        
        // Check if should lock
        if (await this.shouldLock()) {
          await this.lockApp();
        }
      } else {
        // App went to background
        await this.updateLastActiveTime();
      }
    });
  }

  /**
   * Setup inactivity monitoring
   */
  private setupInactivityMonitoring(): void {
    // Monitor user activity
    this.platform.ready().then(() => {
      // Reset timer on any user interaction
      document.addEventListener('click', () => this.updateLastActiveTime());
      document.addEventListener('touchstart', () => this.updateLastActiveTime());
      document.addEventListener('keydown', () => this.updateLastActiveTime());

      // Check periodically
      setInterval(async () => {
        if (await this.isLockAfterInactivityEnabled()) {
          if (await this.shouldLock()) {
            await this.lockApp();
          }
        }
      }, 60000); // Check every minute
    });
  }
}

