import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { BookService } from '../../../core/services/book.service';
import { User } from '../../../core/models/user.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.page.html',
  styleUrls: ['./profile-settings.page.scss'],
  standalone: false,
})
export class ProfileSettingsPage implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private businessService: BusinessService,
    private bookService: BookService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.profileForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      mobile: ['']
    });
  }

  async ngOnInit() {
    this.currentUser = await this.authService.getCurrentUser();
    if (this.currentUser) {
      this.profileForm.patchValue({
        email: this.currentUser.email,
        mobile: this.currentUser.mobile || ''
      });
    }
  }

  async updateProfile() {
    if (this.profileForm.invalid || !this.currentUser) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Updating profile...'
    });
    await loading.present();

    try {
      await this.authService.updateProfile(this.currentUser.id, {
        email: this.profileForm.value.email,
        mobile: this.profileForm.value.mobile
      });

      const toast = await this.toastController.create({
        message: 'Profile updated successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to update profile',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Logging out...'
            });
            await loading.present();

            try {
              // Clear current business and book selections before logout
              await this.businessService.clearCurrentBusiness();
              await this.bookService.clearCurrentBook();
              
              // Logout from auth service
              await this.authService.logout();
              
              // Navigate to login page
              await loading.dismiss();
              this.router.navigate(['/login'], { replaceUrl: true });
            } catch (error: any) {
              await loading.dismiss();
              const toast = await this.toastController.create({
                message: error.message || 'Failed to logout',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}

