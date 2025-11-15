import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../core/services/business.service';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessTeam, BusinessRole } from '../../../core/models/business.model';
import { User } from '../../../core/models/user.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-team-management',
  templateUrl: './team-management.page.html',
  styleUrls: ['./team-management.page.scss'],
  standalone: false,
})
export class TeamManagementPage implements OnInit {
  businessId: string | null = null;
  teamMembers: BusinessTeam[] = [];
  currentUser: User | null = null;
  userRole: BusinessRole | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessService: BusinessService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.businessId = this.route.snapshot.paramMap.get('id');
    this.currentUser = await this.authService.getCurrentUser();
    
    if (this.businessId) {
      await this.loadTeamMembers();
      if (this.currentUser) {
        this.userRole = await this.businessService.getUserRole(this.businessId);
      }
    }
  }

  async loadTeamMembers() {
    if (!this.businessId) return;

    const loading = await this.loadingController.create({
      message: 'Loading team members...'
    });
    await loading.present();

    try {
      this.teamMembers = await this.businessService.getTeamMembers(this.businessId);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load team members',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async updateRole(member: BusinessTeam) {
    const alert = await this.alertController.create({
      header: 'Update Role',
      inputs: [
        {
          type: 'radio',
          label: 'Owner',
          value: 'owner',
          checked: member.role === 'owner',
          disabled: member.role === 'owner'
        },
        {
          type: 'radio',
          label: 'Business Partner',
          value: 'business_partner',
          checked: member.role === 'business_partner'
        },
        {
          type: 'radio',
          label: 'Staff Member',
          value: 'staff_member',
          checked: member.role === 'staff_member'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: async (value) => {
            if (!this.businessId) return;

            const loading = await this.loadingController.create({
              message: 'Updating role...'
            });
            await loading.present();

            try {
              await this.businessService.updateTeamMemberRole(
                this.businessId,
                member.user_id,
                value as BusinessRole
              );
              await this.loadTeamMembers();
              
              const toast = await this.toastController.create({
                message: 'Role updated successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to update role',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async removeMember(member: BusinessTeam) {
    const alert = await this.alertController.create({
      header: 'Remove Member',
      message: 'Are you sure you want to remove this team member?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            if (!this.businessId) return;

            const loading = await this.loadingController.create({
              message: 'Removing member...'
            });
            await loading.present();

            try {
              await this.businessService.removeTeamMember(this.businessId, member.user_id);
              await this.loadTeamMembers();
              
              const toast = await this.toastController.create({
                message: 'Member removed successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to remove member',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async inviteMember() {
    this.router.navigate(['/business/invite', this.businessId]);
  }

  canManageTeam(): boolean {
    return this.userRole === 'owner' || this.userRole === 'business_partner';
  }

  getRoleLabel(role: BusinessRole): string {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'business_partner':
        return 'Business Partner';
      case 'staff_member':
        return 'Staff Member';
      default:
        return role;
    }
  }
}

