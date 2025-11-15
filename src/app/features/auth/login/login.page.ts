import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DeepLinkService } from '../../../core/services/deep-link.service';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private deepLinkService: DeepLinkService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.group({
      emailOrMobile: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {}

  async login() {
    if (this.loginForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...'
    });
    await loading.present();

    try {
      const { emailOrMobile, password } = this.loginForm.value;
      await this.authService.login(emailOrMobile, password);
      
      // Check for pending invitation
      const pendingInvitation = await this.deepLinkService.getPendingInvitation();
      if (pendingInvitation) {
        // Process invitation after login
        await this.deepLinkService.handleDeepLink(
          `cashlia://invite?business=${pendingInvitation.businessId}&token=${pendingInvitation.token || ''}`
        );
      }
      
      await loading.dismiss();
      
      // Check if there's an invite in query params
      const inviteId = this.route.snapshot.queryParamMap.get('invite');
      if (inviteId) {
        const token = this.route.snapshot.queryParamMap.get('token');
        await this.deepLinkService.handleDeepLink(
          `cashlia://invite?business=${inviteId}&token=${token || ''}`
        );
      } else {
        this.router.navigate(['/home']);
      }
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Login failed',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async loginWithGoogle() {
    const loading = await this.loadingController.create({
      message: 'Signing in with Google...'
    });
    await loading.present();

    try {
      await this.authService.signInWithGoogle();
      await loading.dismiss();
      this.router.navigate(['/home']);
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Google Sign-In failed',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}

