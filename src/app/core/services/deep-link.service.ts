import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { BusinessService } from './business.service';
import { AuthService } from './auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class DeepLinkService {
  constructor(
    private router: Router,
    private businessService: BusinessService,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    this.setupDeepLinkListener();
  }

  /**
   * Setup deep link listener
   */
  private setupDeepLinkListener(): void {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.handleDeepLink(event.url);
    });
  }

  /**
   * Handle deep link URL
   */
  async handleDeepLink(url: string): Promise<void> {
    try {
      // Parse URL: cashlia://invite?business=<business_id>&token=<token>
      const urlObj = new URL(url);
      const path = urlObj.hostname || urlObj.pathname;

      if (path === 'invite' || url.includes('invite')) {
        const businessId = urlObj.searchParams.get('business');
        const token = urlObj.searchParams.get('token');

        if (businessId) {
          await this.handleInvitation(businessId, token);
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  /**
   * Handle business invitation
   */
  private async handleInvitation(businessId: string, token: string | null): Promise<void> {
    try {
      // Check if user is authenticated
      const isAuthenticated = await this.authService.isAuthenticated();
      
      if (!isAuthenticated) {
        // Store invitation for later processing
        await this.storePendingInvitation(businessId, token);
        // Redirect to login
        this.router.navigate(['/login'], {
          queryParams: { invite: businessId, token }
        });
        return;
      }

      // User is authenticated, process invitation
      await this.acceptInvitation(businessId, token);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to process invitation',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Store pending invitation
   */
  private async storePendingInvitation(businessId: string, token: string | null): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({
      key: 'pending_invitation',
      value: JSON.stringify({ businessId, token })
    });
  }

  /**
   * Get pending invitation
   */
  async getPendingInvitation(): Promise<{ businessId: string; token: string | null } | null> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const stored = await Preferences.get({ key: 'pending_invitation' });
      if (stored.value) {
        const invitation = JSON.parse(stored.value);
        // Clear after reading
        await Preferences.remove({ key: 'pending_invitation' });
        return invitation;
      }
    } catch (error) {
      console.error('Error getting pending invitation:', error);
    }
    return null;
  }

  /**
   * Accept invitation
   */
  private async acceptInvitation(businessId: string, token: string | null): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate token if provided
      if (token) {
        const { DatabaseService } = await import('./database.service');
        const db = new DatabaseService();
        try {
          await db.initializeDatabase();
        } catch (error) {
          // Database might already be initialized
        }
        
        const invitations = await db.query(
          'SELECT * FROM business_invitations WHERE token = ? AND business_id = ? AND expires_at > ?',
          [token, businessId, Date.now()]
        );

        if (invitations.length === 0) {
          throw new Error('Invalid or expired invitation token');
        }

        const invitation = invitations[0];
        const role = invitation.role || 'staff_member';

        // Add user to business team with the role from invitation
        await this.businessService.addTeamMember(businessId, user.id, role, user.id);

        // Delete used invitation
        await db.execute('DELETE FROM business_invitations WHERE token = ?', [token]);
      } else {
        // No token, add as staff member (for backward compatibility)
        await this.businessService.addTeamMember(businessId, user.id, 'staff_member', user.id);
      }

      const toast = await this.toastController.create({
        message: 'Invitation accepted successfully',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Navigate to business
      this.router.navigate(['/business']);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to accept invitation');
    }
  }

  /**
   * Generate invitation link with token
   */
  async generateInvitationLink(businessId: string, role: string): Promise<string> {
    // Generate a secure token for the invitation
    const token = this.generateToken();
    
    // Store invitation in database
    // In production, store with expiration date
    const { DatabaseService } = await import('./database.service');
    const db = new DatabaseService();
    
    const now = Date.now();
    await db.execute(
      'INSERT OR REPLACE INTO business_invitations (business_id, token, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      [businessId, token, role, now, now + (7 * 24 * 60 * 60 * 1000)] // 7 days expiry
    );

    return `cashlia://invite?business=${businessId}&token=${token}`;
  }

  /**
   * Generate secure token
   */
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

