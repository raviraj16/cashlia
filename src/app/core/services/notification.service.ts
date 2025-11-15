import { Injectable } from '@angular/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly FCM_TOKEN_KEY = 'fcm_token';
  private readonly NOTIFICATION_PREFS_KEY = 'notification_preferences';

  constructor(private router: Router) {
    this.setupNotificationListeners();
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Show local notification
   */
  async showNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permission not granted');
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            data,
            sound: 'default',
            priority: 'high'
          }
        ]
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification tap
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const data = notification.notification.data;
      if (data && data.route) {
        this.router.navigate([data.route]);
      }
    });
  }

  /**
   * Get FCM token (placeholder - requires backend)
   */
  async getFCMToken(): Promise<string | null> {
    try {
      const stored = await Preferences.get({ key: this.FCM_TOKEN_KEY });
      return stored.value;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Store FCM token
   */
  async storeFCMToken(token: string): Promise<void> {
    await Preferences.set({ key: this.FCM_TOKEN_KEY, value: token });
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const stored = await Preferences.get({ key: this.NOTIFICATION_PREFS_KEY });
      if (stored.value) {
        return JSON.parse(stored.value);
      }
      return {
        businessChanges: true,
        bookChanges: true,
        entryChanges: true
      };
    } catch (error) {
      return {
        businessChanges: true,
        bookChanges: true,
        entryChanges: true
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(prefs: any): Promise<void> {
    await Preferences.set({
      key: this.NOTIFICATION_PREFS_KEY,
      value: JSON.stringify(prefs)
    });
  }

  /**
   * Notify about business changes
   */
  async notifyBusinessChange(action: string, businessName: string): Promise<void> {
    const prefs = await this.getNotificationPreferences();
    if (prefs.businessChanges) {
      await this.showNotification(
        'Business Updated',
        `${businessName}: ${action}`,
        { route: '/business' }
      );
    }
  }

  /**
   * Notify about book changes
   */
  async notifyBookChange(action: string, bookName: string): Promise<void> {
    const prefs = await this.getNotificationPreferences();
    if (prefs.bookChanges) {
      await this.showNotification(
        'Book Updated',
        `${bookName}: ${action}`,
        { route: '/books' }
      );
    }
  }

  /**
   * Notify about entry changes
   */
  async notifyEntryChange(action: string, amount?: number): Promise<void> {
    const prefs = await this.getNotificationPreferences();
    if (prefs.entryChanges) {
      const message = amount 
        ? `Entry ${action}: ${amount}`
        : `Entry ${action}`;
      await this.showNotification(
        'Entry Updated',
        message,
        { route: '/entries/list' }
      );
    }
  }
}

