import { Component, OnInit } from '@angular/core';
import { SyncService, SyncMethod } from '../../../core/services/sync.service';
import { GoogleDriveService } from '../../../core/services/google-drive.service';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-sync-settings',
  templateUrl: './sync-settings.page.html',
  styleUrls: ['./sync-settings.page.scss'],
  standalone: false,
})
export class SyncSettingsPage implements OnInit {
  syncMethod: SyncMethod = 'none';
  isGoogleDriveAuthenticated = false;
  lastSyncTime: string | null = null;
  syncStatus: 'idle' | 'syncing' | 'error' = 'idle';

  constructor(
    private syncService: SyncService,
    private googleDriveService: GoogleDriveService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    this.syncMethod = await this.syncService.getSyncMethod();
    if (this.syncMethod === 'google_drive') {
      this.isGoogleDriveAuthenticated = await this.googleDriveService.isAuthenticated();
    }
  }

  async selectSyncMethod(method: SyncMethod) {
    if (method === 'google_drive') {
      const alert = await this.alertController.create({
        header: 'Google Drive Sync',
        message: 'You will be redirected to authenticate with Google Drive.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Continue',
            handler: async () => {
              await this.setupGoogleDrive();
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.syncService.setSyncMethod(method);
      await this.loadSettings();
    }
  }

  async setupGoogleDrive() {
    const loading = await this.loadingController.create({
      message: 'Setting up Google Drive...'
    });
    await loading.present();

    try {
      await this.googleDriveService.authenticate();
      await this.syncService.setSyncMethod('google_drive');
      await this.loadSettings();
      
      const toast = await this.toastController.create({
        message: 'Google Drive connected successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to connect Google Drive',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async syncNow() {
    if (this.syncMethod === 'none') {
      const toast = await this.toastController.create({
        message: 'Please select a sync method first',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Syncing...'
    });
    await loading.present();
    this.syncStatus = 'syncing';

    try {
      await this.syncService.syncAll();
      this.lastSyncTime = new Date().toISOString();
      this.syncStatus = 'idle';
      
      const toast = await this.toastController.create({
        message: 'Sync completed successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      this.syncStatus = 'error';
      const toast = await this.toastController.create({
        message: error.message || 'Sync failed',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async disconnectSync() {
    const alert = await this.alertController.create({
      header: 'Disconnect Sync',
      message: 'Are you sure you want to disconnect sync? Your data will remain local.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Disconnect',
          handler: async () => {
            await this.syncService.setSyncMethod('none');
            await this.loadSettings();
          }
        }
      ]
    });

    await alert.present();
  }
}

