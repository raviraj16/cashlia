import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { Business, BusinessTeam, BusinessRole } from '../models/business.model';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private readonly CURRENT_BUSINESS_KEY = 'current_business_id';
  private currentBusinessId: string | null = null;

  constructor(
    private db: DatabaseService,
    private authService: AuthService
  ) {}

  /**
   * Create a new business
   */
  async createBusiness(name: string): Promise<Business> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const businessId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const business: Business = {
      id: businessId,
      name,
      owner_id: user.id,
      created_at: now,
      updated_at: now,
      is_deleted: 0,
      sync_status: 'pending'
    };

    await this.db.execute(
      'INSERT INTO businesses (id, name, owner_id, created_at, updated_at, is_deleted, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [business.id, business.name, business.owner_id, business.created_at, business.updated_at, business.is_deleted, business.sync_status]
    );

    // Add owner to business team
    await this.addTeamMember(businessId, user.id, 'owner', user.id);

    // Set as current business if no current business
    if (!this.currentBusinessId) {
      await this.setCurrentBusiness(businessId);
    }

    return business;
  }

  /**
   * Get all businesses for current user
   */
  async getBusinesses(): Promise<Business[]> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return [];
    }

    // Get businesses owned by user
    const ownedBusinesses = await this.db.query(
      'SELECT * FROM businesses WHERE owner_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
      [user.id]
    );

    // Get businesses where user is a team member
    const teamMemberships = await this.db.query(
      'SELECT business_id FROM business_team WHERE user_id = ?',
      [user.id]
    );

    const teamBusinessIds = teamMemberships.map((tm: any) => tm.business_id);
    
    let teamBusinesses: Business[] = [];
    if (teamBusinessIds.length > 0) {
      // Build query for team businesses
      const placeholders = teamBusinessIds.map(() => '?').join(',');
      teamBusinesses = await this.db.query(
        `SELECT * FROM businesses WHERE id IN (${placeholders}) AND is_deleted = 0 ORDER BY updated_at DESC`,
        teamBusinessIds
      );
    }

    // Combine and deduplicate
    const allBusinesses = [...ownedBusinesses, ...teamBusinesses];
    const uniqueBusinesses = allBusinesses.filter((business, index, self) =>
      index === self.findIndex((b) => b.id === business.id)
    );

    // Sort by updated_at DESC
    uniqueBusinesses.sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return uniqueBusinesses as Business[];
  }

  /**
   * Get business by ID
   */
  async getBusinessById(businessId: string): Promise<Business | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return null;
    }

    // Get all businesses for the current user and check if the requested business is in the list
    // This ensures we only return businesses that belong to the current user
    const businesses = await this.getBusinesses();
    const business = businesses.find(b => b.id === businessId && b.is_deleted === 0);

    return business || null;
  }

  /**
   * Update business
   */
  async updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
    const now = this.db.getCurrentTimestamp();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(businessId);

    await this.db.execute(
      `UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete business (soft delete)
   */
  async deleteBusiness(businessId: string): Promise<void> {
    const now = this.db.getCurrentTimestamp();
    await this.db.execute(
      'UPDATE businesses SET is_deleted = 1, updated_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending', businessId]
    );

    // Clear current business if deleted
    if (this.currentBusinessId === businessId) {
      await this.clearCurrentBusiness();
    }
  }

  /**
   * Set current business
   */
  async setCurrentBusiness(businessId: string): Promise<void> {
    this.currentBusinessId = businessId;
    await Preferences.set({
      key: this.CURRENT_BUSINESS_KEY,
      value: businessId
    });
    
    // Clear current book if it doesn't belong to the new business
    // We need to import BookService, but to avoid circular dependency,
    // we'll handle this in the BookService's getCurrentBook method instead
  }

  /**
   * Get current business
   */
  async getCurrentBusiness(): Promise<Business | null> {
    if (!this.currentBusinessId) {
      const stored = await Preferences.get({ key: this.CURRENT_BUSINESS_KEY });
      if (stored.value) {
        this.currentBusinessId = stored.value;
      }
    }

    if (this.currentBusinessId) {
      const business = await this.getBusinessById(this.currentBusinessId);
      
      // Validate that the business belongs to the current user
      if (business) {
        const user = await this.authService.getCurrentUser();
        if (!user) {
          // User not authenticated, clear selection
          await this.clearCurrentBusiness();
          return null;
        }
        
        // Check if user owns the business or is a team member
        const businesses = await this.getBusinesses();
        const belongsToUser = businesses.some(b => b.id === business.id);
        
        if (!belongsToUser) {
          // Business doesn't belong to current user, clear selection
          await this.clearCurrentBusiness();
          return null;
        }
      }
      
      return business;
    }

    return null;
  }

  /**
   * Get current business ID
   */
  async getCurrentBusinessId(): Promise<string | null> {
    if (!this.currentBusinessId) {
      const stored = await Preferences.get({ key: this.CURRENT_BUSINESS_KEY });
      if (stored.value) {
        this.currentBusinessId = stored.value;
      }
    }
    return this.currentBusinessId;
  }

  /**
   * Clear current business
   */
  async clearCurrentBusiness(): Promise<void> {
    this.currentBusinessId = null;
    await Preferences.remove({ key: this.CURRENT_BUSINESS_KEY });
  }

  /**
   * Add team member
   */
  async addTeamMember(businessId: string, userId: string, role: BusinessRole, invitedBy: string): Promise<BusinessTeam> {
    const teamId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const teamMember: BusinessTeam = {
      id: teamId,
      business_id: businessId,
      user_id: userId,
      role,
      invited_by: invitedBy,
      joined_at: now,
      sync_status: 'pending'
    };

    await this.db.execute(
      'INSERT OR REPLACE INTO business_team (id, business_id, user_id, role, invited_by, joined_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [teamMember.id, teamMember.business_id, teamMember.user_id, teamMember.role, teamMember.invited_by, teamMember.joined_at, teamMember.sync_status]
    );

    return teamMember;
  }

  /**
   * Get team members for a business
   */
  async getTeamMembers(businessId: string): Promise<BusinessTeam[]> {
    const members = await this.db.query(
      'SELECT * FROM business_team WHERE business_id = ? ORDER BY joined_at ASC',
      [businessId]
    );

    return members as BusinessTeam[];
  }

  /**
   * Remove team member
   */
  async removeTeamMember(businessId: string, userId: string): Promise<void> {
    await this.db.execute(
      'DELETE FROM business_team WHERE business_id = ? AND user_id = ?',
      [businessId, userId]
    );
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(businessId: string, userId: string, role: BusinessRole): Promise<void> {
    await this.db.execute(
      'UPDATE business_team SET role = ?, sync_status = ? WHERE business_id = ? AND user_id = ?',
      [role, 'pending', businessId, userId]
    );
  }

  /**
   * Get user role in business
   */
  async getUserRole(businessId: string): Promise<BusinessRole | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return null;
    }

    // Check if owner
    const business = await this.getBusinessById(businessId);
    if (business && business.owner_id === user.id) {
      return 'owner';
    }

    // Check team membership
    const members = await this.db.query(
      'SELECT role FROM business_team WHERE business_id = ? AND user_id = ?',
      [businessId, user.id]
    );

    return members.length > 0 ? (members[0].role as BusinessRole) : null;
  }
}

