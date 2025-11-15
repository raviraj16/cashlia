import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatabaseService } from '../../../core/services/database.service';
import { EncryptionService } from '../../../core/services/encryption.service';
import { LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage implements OnInit {
  forgotPasswordForm: FormGroup;
  resetForm: FormGroup;
  step: 'email' | 'reset' = 'email';
  resetToken: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private db: DatabaseService,
    private encryption: EncryptionService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      emailOrMobile: ['', [Validators.required]]
    });

    this.resetForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {}

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (confirmPassword) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  async requestReset() {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Processing request...'
    });
    await loading.present();

    try {
      const { emailOrMobile } = this.forgotPasswordForm.value;
      
      // Check if user exists
      const users = await this.db.query(
        'SELECT * FROM users WHERE email = ? OR mobile = ?',
        [emailOrMobile, emailOrMobile]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      // Generate reset token (simplified - in production, use proper token system)
      this.resetToken = this.db.generateUUID();
      
      // In production, send reset token via email/SMS
      // For now, just proceed to reset step
      this.step = 'reset';

      const toast = await this.toastController.create({
        message: 'Reset instructions would be sent to your email/mobile',
        duration: 3000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to process request',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async resetPassword() {
    if (this.resetForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Resetting password...'
    });
    await loading.present();

    try {
      const { emailOrMobile } = this.forgotPasswordForm.value;
      const { newPassword } = this.resetForm.value;

      // Hash new password
      const passwordHash = this.encryption.hashPassword(newPassword);

      // Update password
      await this.db.execute(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ? OR mobile = ?',
        [passwordHash, this.db.getCurrentTimestamp(), emailOrMobile, emailOrMobile]
      );

      const toast = await this.toastController.create({
        message: 'Password reset successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

      this.router.navigate(['/login']);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to reset password',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}

