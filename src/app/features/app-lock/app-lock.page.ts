import { Component, OnInit } from '@angular/core';
import { AppLockService } from '../../core/services/app-lock.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-app-lock',
  templateUrl: './app-lock.page.html',
  styleUrls: ['./app-lock.page.scss'],
  standalone: false,
})
export class AppLockPage implements OnInit {
  pin: string = '';
  showBiometric = false;

  constructor(
    private appLockService: AppLockService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    this.showBiometric = await this.appLockService.isBiometricEnabled();
    
    // Try biometric unlock if enabled
    if (this.showBiometric) {
      await this.unlockWithBiometric();
    }
  }

  async onPinInput(value: string) {
    this.pin = value;
    
    if (this.pin.length === 4) {
      const unlocked = await this.appLockService.unlockWithPin(this.pin);
      
      if (!unlocked) {
        const toast = await this.toastController.create({
          message: 'Incorrect PIN',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        this.pin = '';
      }
    }
  }

  async unlockWithBiometric() {
    const unlocked = await this.appLockService.unlockWithBiometric();
    
    if (!unlocked) {
      const toast = await this.toastController.create({
        message: 'Biometric authentication failed',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}

