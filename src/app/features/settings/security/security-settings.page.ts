import { Component, OnInit } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-security-settings',
  templateUrl: './security-settings.page.html',
  styleUrls: ['./security-settings.page.scss'],
  standalone: false,
})
export class SecuritySettingsPage implements OnInit {
  pinEnabled = false;
  biometricEnabled = false;
  lockAfterInactivity = false;
  inactivityMinutes = 5;

  constructor(
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    const pinPref = await Preferences.get({ key: 'pin_enabled' });
    this.pinEnabled = pinPref.value === 'true';

    const bioPref = await Preferences.get({ key: 'biometric_enabled' });
    this.biometricEnabled = bioPref.value === 'true';

    const lockPref = await Preferences.get({ key: 'lock_after_inactivity' });
    this.lockAfterInactivity = lockPref.value === 'true';

    const minutesPref = await Preferences.get({ key: 'inactivity_minutes' });
    this.inactivityMinutes = minutesPref.value ? parseInt(minutesPref.value) : 5;
  }

  async togglePin() {
    if (!this.pinEnabled) {
      // Enable PIN
      const alert = await this.alertController.create({
        header: 'Set PIN',
        inputs: [
          {
            name: 'pin',
            type: 'password',
            placeholder: 'Enter 4-digit PIN',
            attributes: {
              maxlength: 4,
              pattern: '[0-9]*'
            }
          },
          {
            name: 'confirmPin',
            type: 'password',
            placeholder: 'Confirm PIN',
            attributes: {
              maxlength: 4,
              pattern: '[0-9]*'
            }
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Set PIN',
            handler: async (data) => {
              if (data.pin.length !== 4 || data.pin !== data.confirmPin) {
                const toast = await this.toastController.create({
                  message: 'PIN must be 4 digits and match',
                  duration: 2000,
                  color: 'danger'
                });
                await toast.present();
                return false;
              }

              await Preferences.set({ key: 'pin', value: data.pin });
              await Preferences.set({ key: 'pin_enabled', value: 'true' });
              this.pinEnabled = true;

              const toast = await this.toastController.create({
                message: 'PIN enabled successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
              return true;
            }
          }
        ]
      });
      await alert.present();
    } else {
      // Disable PIN
      const alert = await this.alertController.create({
        header: 'Disable PIN',
        message: 'Are you sure you want to disable PIN protection?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Disable',
            handler: async () => {
              await Preferences.remove({ key: 'pin' });
              await Preferences.set({ key: 'pin_enabled', value: 'false' });
              this.pinEnabled = false;

              const toast = await this.toastController.create({
                message: 'PIN disabled',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            }
          }
        ]
      });
      await alert.present();
    }
  }

  async toggleBiometric() {
    if (!this.biometricEnabled) {
      // Request biometric permission
      try {
        const result = await LocalNotifications.requestPermissions();
        // In production, use proper biometric authentication
        await Preferences.set({ key: 'biometric_enabled', value: 'true' });
        this.biometricEnabled = true;

        const toast = await this.toastController.create({
          message: 'Biometric authentication enabled',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to enable biometric authentication',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    } else {
      await Preferences.set({ key: 'biometric_enabled', value: 'false' });
      this.biometricEnabled = false;

      const toast = await this.toastController.create({
        message: 'Biometric authentication disabled',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    }
  }

  async toggleLockAfterInactivity() {
    this.lockAfterInactivity = !this.lockAfterInactivity;
    await Preferences.set({
      key: 'lock_after_inactivity',
      value: this.lockAfterInactivity.toString()
    });
  }

  async updateInactivityMinutes() {
    await Preferences.set({
      key: 'inactivity_minutes',
      value: this.inactivityMinutes.toString()
    });
  }
}

