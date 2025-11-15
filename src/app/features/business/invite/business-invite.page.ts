import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BusinessService } from '../../../core/services/business.service';
import { DeepLinkService } from '../../../core/services/deep-link.service';
import { LoadingController, ToastController } from '@ionic/angular';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-business-invite',
  templateUrl: './business-invite.page.html',
  styleUrls: ['./business-invite.page.scss'],
  standalone: false,
})
export class BusinessInvitePage implements OnInit {
  inviteForm: FormGroup;
  businessId: string | null = null;
  inviteLink: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private businessService: BusinessService,
    private deepLinkService: DeepLinkService,
    private route: ActivatedRoute,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.inviteForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      mobile: [''],
      role: ['staff_member', Validators.required]
    });
  }

  async ngOnInit() {
    this.businessId = this.route.snapshot.paramMap.get('id');
    if (this.businessId) {
      await this.generateInviteLink();
    }
  }

  async generateInviteLink() {
    if (this.businessId) {
      const { role } = this.inviteForm.value;
      this.inviteLink = await this.deepLinkService.generateInvitationLink(this.businessId, role);
    }
  }

  async sendInvite() {
    if (this.inviteForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Sending invitation...'
    });
    await loading.present();

    try {
      const { email, mobile, role } = this.inviteForm.value;
      
      // TODO: In production, send invitation via email/SMS
      // For now, just show the invite link
      
      const toast = await this.toastController.create({
        message: 'Invitation link generated. Share it with the user.',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Share the invite link
      await this.shareInviteLink();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to send invitation',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async shareInviteLink() {
    try {
      await Share.share({
        title: 'Business Invitation',
        text: `You've been invited to join a business on Cashlia. Click the link to accept: ${this.inviteLink}`,
        url: this.inviteLink,
        dialogTitle: 'Share Invitation'
      });
    } catch (error) {
      console.error('Error sharing invite link:', error);
    }
  }

  copyInviteLink() {
    // Copy to clipboard functionality
    navigator.clipboard.writeText(this.inviteLink).then(() => {
      this.toastController.create({
        message: 'Invite link copied to clipboard',
        duration: 2000,
        color: 'success'
      }).then(toast => toast.present());
    });
  }
}

