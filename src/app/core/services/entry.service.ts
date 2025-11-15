import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { BookService } from './book.service';
import { PartyService } from './party.service';
import { CategoryService } from './category.service';
import { Entry, EntryType, PaymentMode, ActivityLog } from '../models/entry.model';

export interface EntryFilters {
  dateFilter?: 'all' | 'today' | 'yesterday' | 'this_month' | 'last_month' | 'range';
  dateFrom?: string;
  dateTo?: string;
  entryType?: EntryType[];
  members?: string[];
  parties?: string[];
  categories?: string[];
  paymentModes?: PaymentMode[];
}

export interface EntrySummary {
  netBalance: number;
  totalCashIn: number;
  totalCashOut: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntryService {
  constructor(
    private db: DatabaseService,
    private authService: AuthService,
    private bookService: BookService,
    private partyService: PartyService,
    private categoryService: CategoryService
  ) {}

  /**
   * Create a new entry
   */
  async createEntry(entryData: Partial<Entry>): Promise<Entry> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const bookId = await this.bookService.getCurrentBookId();
    if (!bookId) {
      throw new Error('No book selected');
    }

    const entryId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const entry: Entry = {
      id: entryId,
      book_id: bookId,
      type: entryData.type || 'cash_in',
      amount: entryData.amount || 0,
      party_id: entryData.party_id,
      category_id: entryData.category_id,
      payment_mode: entryData.payment_mode || 'cash',
      date_time: entryData.date_time || now,
      remarks: entryData.remarks,
      attachment_path: entryData.attachment_path,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await this.db.execute(
      `INSERT INTO entries (id, book_id, type, amount, party_id, category_id, payment_mode, date_time, remarks, attachment_path, created_by, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id, entry.book_id, entry.type, entry.amount, entry.party_id, entry.category_id,
        entry.payment_mode, entry.date_time, entry.remarks, entry.attachment_path,
        entry.created_by, entry.created_at, entry.updated_at, entry.sync_status
      ]
    );

    // Log activity
    await this.logActivity(entryId, user.id, 'created', 'Entry created');

    return entry;
  }

  /**
   * Get entries with filters
   */
  async getEntries(filters?: EntryFilters): Promise<Entry[]> {
    const bookId = await this.bookService.getCurrentBookId();
    if (!bookId) {
      return [];
    }

    let query = 'SELECT * FROM entries WHERE book_id = ? AND 1=1';
    const params: any[] = [bookId];

    if (filters) {
      // Date filter
      if (filters.dateFilter && filters.dateFilter !== 'all') {
        const dateCondition = this.getDateCondition(filters.dateFilter, filters.dateFrom, filters.dateTo);
        query += ` AND ${dateCondition.condition}`;
        params.push(...dateCondition.params);
      }

      // Entry type filter
      if (filters.entryType && filters.entryType.length > 0) {
        const placeholders = filters.entryType.map(() => '?').join(',');
        query += ` AND type IN (${placeholders})`;
        params.push(...filters.entryType);
      }

      // Members filter
      if (filters.members && filters.members.length > 0) {
        const placeholders = filters.members.map(() => '?').join(',');
        query += ` AND created_by IN (${placeholders})`;
        params.push(...filters.members);
      }

      // Parties filter
      if (filters.parties && filters.parties.length > 0) {
        const placeholders = filters.parties.map(() => '?').join(',');
        query += ` AND party_id IN (${placeholders})`;
        params.push(...filters.parties);
      }

      // Categories filter
      if (filters.categories && filters.categories.length > 0) {
        const placeholders = filters.categories.map(() => '?').join(',');
        query += ` AND category_id IN (${placeholders})`;
        params.push(...filters.categories);
      }

      // Payment modes filter
      if (filters.paymentModes && filters.paymentModes.length > 0) {
        const placeholders = filters.paymentModes.map(() => '?').join(',');
        query += ` AND payment_mode IN (${placeholders})`;
        params.push(...filters.paymentModes);
      }
    }

    query += ' ORDER BY date_time DESC';

    const entries = await this.db.query(query, params);
    return entries as Entry[];
  }

  /**
   * Get entry by ID
   */
  async getEntryById(entryId: string): Promise<Entry | null> {
    const entries = await this.db.query(
      'SELECT * FROM entries WHERE id = ?',
      [entryId]
    );

    if (entries.length === 0) {
      return null;
    }

    const entry = entries[0] as Entry;
    
    // Validate that the entry's book belongs to the current business
    const bookId = await this.bookService.getCurrentBookId();
    if (!bookId || entry.book_id !== bookId) {
      // Entry doesn't belong to current book, return null
      return null;
    }

    return entry;
  }

  /**
   * Update entry
   */
  async updateEntry(entryId: string, updates: Partial<Entry>): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate that the entry belongs to the current business
    const entry = await this.getEntryById(entryId);
    if (!entry) {
      throw new Error('Entry not found or does not belong to current business');
    }

    const now = this.db.getCurrentTimestamp();
    const fields: string[] = [];
    const values: any[] = [];
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Helper function to format value for display
    const formatValue = async (field: string, value: any): Promise<string> => {
      if (value === null || value === undefined || value === '') {
        return 'None';
      }
      
      switch (field) {
        case 'type':
          return value === 'cash_in' ? 'Cash In' : 'Cash Out';
        case 'payment_mode':
          return value === 'cash' ? 'Cash' : value === 'online' ? 'Online' : 'Credit Card';
        case 'amount':
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
          }).format(value);
        case 'date_time':
          return new Date(value).toLocaleString();
        case 'party_id':
          if (value) {
            const party = await this.partyService.getPartyById(value);
            return party ? party.name : value;
          }
          return 'None';
        case 'category_id':
          if (value) {
            const category = await this.categoryService.getCategoryById(value);
            return category ? category.name : value;
          }
          return 'None';
        default:
          return String(value);
      }
    };

    // Track changes
    if (updates.type !== undefined && updates.type !== entry.type) {
      const oldVal = await formatValue('type', entry.type);
      const newVal = await formatValue('type', updates.type);
      changes.push({ field: 'Type', oldValue: oldVal, newValue: newVal });
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.amount !== undefined && updates.amount !== entry.amount) {
      const oldVal = await formatValue('amount', entry.amount);
      const newVal = await formatValue('amount', updates.amount);
      changes.push({ field: 'Amount', oldValue: oldVal, newValue: newVal });
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.party_id !== undefined && updates.party_id !== entry.party_id) {
      const oldVal = await formatValue('party_id', entry.party_id);
      const newVal = await formatValue('party_id', updates.party_id);
      changes.push({ field: 'Party', oldValue: oldVal, newValue: newVal });
      fields.push('party_id = ?');
      values.push(updates.party_id);
    }
    if (updates.category_id !== undefined && updates.category_id !== entry.category_id) {
      const oldVal = await formatValue('category_id', entry.category_id);
      const newVal = await formatValue('category_id', updates.category_id);
      changes.push({ field: 'Category', oldValue: oldVal, newValue: newVal });
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.payment_mode !== undefined && updates.payment_mode !== entry.payment_mode) {
      const oldVal = await formatValue('payment_mode', entry.payment_mode);
      const newVal = await formatValue('payment_mode', updates.payment_mode);
      changes.push({ field: 'Payment Mode', oldValue: oldVal, newValue: newVal });
      fields.push('payment_mode = ?');
      values.push(updates.payment_mode);
    }
    if (updates.date_time !== undefined && updates.date_time !== entry.date_time) {
      const oldVal = await formatValue('date_time', entry.date_time);
      const newVal = await formatValue('date_time', updates.date_time);
      changes.push({ field: 'Date & Time', oldValue: oldVal, newValue: newVal });
      fields.push('date_time = ?');
      values.push(updates.date_time);
    }
    if (updates.remarks !== undefined && updates.remarks !== entry.remarks) {
      const oldVal = entry.remarks || 'None';
      const newVal = updates.remarks || 'None';
      changes.push({ field: 'Remarks', oldValue: oldVal, newValue: newVal });
      fields.push('remarks = ?');
      values.push(updates.remarks);
    }
    if (updates.attachment_path !== undefined && updates.attachment_path !== entry.attachment_path) {
      const oldVal = entry.attachment_path ? 'Has attachment' : 'No attachment';
      const newVal = updates.attachment_path ? 'Has attachment' : 'No attachment';
      changes.push({ field: 'Attachment', oldValue: oldVal, newValue: newVal });
      fields.push('attachment_path = ?');
      values.push(updates.attachment_path);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      fields.push('sync_status = ?');
      values.push(now);
      values.push('pending');
      values.push(entryId);

      await this.db.execute(
        `UPDATE entries SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // Log activity with change details
      const details = changes.length > 0 
        ? JSON.stringify({ changes })
        : 'Entry updated';
      await this.logActivity(entryId, user.id, 'updated', details);
    }
  }

  /**
   * Delete entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate that the entry belongs to the current business
    const entry = await this.getEntryById(entryId);
    if (!entry) {
      throw new Error('Entry not found or does not belong to current business');
    }

    await this.db.execute(
      'DELETE FROM entries WHERE id = ?',
      [entryId]
    );

    // Delete activity logs
    await this.db.execute(
      'DELETE FROM activity_logs WHERE entry_id = ?',
      [entryId]
    );
  }

  /**
   * Get entry summary
   */
  async getEntrySummary(filters?: EntryFilters): Promise<EntrySummary> {
    const entries = await this.getEntries(filters);

    let totalCashIn = 0;
    let totalCashOut = 0;

    entries.forEach(entry => {
      if (entry.type === 'cash_in') {
        totalCashIn += entry.amount;
      } else {
        totalCashOut += entry.amount;
      }
    });

    return {
      netBalance: totalCashIn - totalCashOut,
      totalCashIn,
      totalCashOut
    };
  }

  /**
   * Get activity logs for an entry
   */
  async getActivityLogs(entryId: string): Promise<ActivityLog[]> {
    const logs = await this.db.query(
      'SELECT * FROM activity_logs WHERE entry_id = ? ORDER BY created_at DESC',
      [entryId]
    );

    return logs as ActivityLog[];
  }

  /**
   * Log activity
   */
  private async logActivity(entryId: string, userId: string, action: string, details?: string): Promise<void> {
    const logId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    await this.db.execute(
      'INSERT INTO activity_logs (id, entry_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [logId, entryId, userId, action, details, now]
    );
  }

  /**
   * Get date condition for filtering
   */
  private getDateCondition(filter: string, dateFrom?: string, dateTo?: string): { condition: string; params: any[] } {
    const now = new Date();
    let condition = '';
    const params: any[] = [];

    switch (filter) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        condition = 'date_time >= ? AND date_time <= ?';
        params.push(todayStart, todayEnd);
        break;

      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
        const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();
        condition = 'date_time >= ? AND date_time <= ?';
        params.push(yesterdayStart, yesterdayEnd);
        break;

      case 'this_month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        condition = 'date_time >= ? AND date_time <= ?';
        params.push(monthStart, monthEnd);
        break;

      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        condition = 'date_time >= ? AND date_time <= ?';
        params.push(lastMonthStart, lastMonthEnd);
        break;

      case 'range':
        if (dateFrom && dateTo) {
          condition = 'date_time >= ? AND date_time <= ?';
          params.push(dateFrom, dateTo);
        }
        break;
    }

    return { condition, params };
  }
}

