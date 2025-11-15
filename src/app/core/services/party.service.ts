import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { BusinessService } from './business.service';
import { Party } from '../models/party.model';

@Injectable({
  providedIn: 'root'
})
export class PartyService {
  constructor(
    private db: DatabaseService,
    private businessService: BusinessService
  ) {}

  /**
   * Create a new party
   */
  async createParty(name: string, phone?: string): Promise<Party> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error('No business selected');
    }

    const partyId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const party: Party = {
      id: partyId,
      business_id: businessId,
      name,
      phone,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await this.db.execute(
      'INSERT INTO parties (id, business_id, name, phone, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [party.id, party.business_id, party.name, party.phone, party.created_at, party.updated_at, party.sync_status]
    );

    return party;
  }

  /**
   * Get all parties for current business
   */
  async getParties(): Promise<Party[]> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      return [];
    }

    const parties = await this.db.query(
      'SELECT * FROM parties WHERE business_id = ? ORDER BY name ASC',
      [businessId]
    );

    return parties as Party[];
  }

  /**
   * Get party by ID
   */
  async getPartyById(partyId: string): Promise<Party | null> {
    const parties = await this.db.query(
      'SELECT * FROM parties WHERE id = ?',
      [partyId]
    );

    if (parties.length === 0) {
      return null;
    }

    const party = parties[0] as Party;
    
    // Validate that the party belongs to the current business
    const currentBusinessId = await this.businessService.getCurrentBusinessId();
    if (!currentBusinessId || party.business_id !== currentBusinessId) {
      return null;
    }

    return party;
  }

  /**
   * Update party
   */
  async updateParty(partyId: string, updates: Partial<Party>): Promise<void> {
    // Validate that the party belongs to the current business
    const party = await this.getPartyById(partyId);
    if (!party) {
      throw new Error('Party not found or does not belong to current business');
    }

    const now = this.db.getCurrentTimestamp();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }

    fields.push('updated_at = ?');
    fields.push('sync_status = ?');
    values.push(now);
    values.push('pending');
    values.push(partyId);

    await this.db.execute(
      `UPDATE parties SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete party
   */
  async deleteParty(partyId: string): Promise<void> {
    // Validate that the party belongs to the current business
    const party = await this.getPartyById(partyId);
    if (!party) {
      throw new Error('Party not found or does not belong to current business');
    }

    // Check if party is used in entries
    const entries = await this.db.query(
      'SELECT COUNT(*) as count FROM entries WHERE party_id = ?',
      [partyId]
    );

    if (entries[0]?.count > 0) {
      throw new Error('Cannot delete party that is used in entries');
    }

    await this.db.execute(
      'DELETE FROM parties WHERE id = ?',
      [partyId]
    );
  }

  /**
   * Search parties
   */
  async searchParties(searchTerm: string): Promise<Party[]> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      return [];
    }

    const parties = await this.db.query(
      'SELECT * FROM parties WHERE business_id = ? AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC',
      [businessId, `%${searchTerm}%`, `%${searchTerm}%`]
    );

    return parties as Party[];
  }
}

