import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DatabaseService } from './database.service';
import { GoogleDriveService } from './google-drive.service';
import { FirestoreService } from './firestore.service';

export type SyncMethod = 'google_drive' | 'firestore' | 'none';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly SYNC_METHOD_KEY = 'sync_method';
  private syncMethod: SyncMethod = 'none';

  constructor(
    private db: DatabaseService,
    private googleDrive: GoogleDriveService,
    private firestore: FirestoreService
  ) {}

  /**
   * Set sync method
   */
  async setSyncMethod(method: SyncMethod): Promise<void> {
    this.syncMethod = method;
    await Preferences.set({ key: this.SYNC_METHOD_KEY, value: method });
  }

  /**
   * Get sync method
   */
  async getSyncMethod(): Promise<SyncMethod> {
    const stored = await Preferences.get({ key: this.SYNC_METHOD_KEY });
    return (stored.value as SyncMethod) || 'none';
  }

  /**
   * Sync all pending data
   */
  async syncAll(): Promise<void> {
    const method = await this.getSyncMethod();
    
    if (method === 'none') {
      throw new Error('No sync method configured');
    }

    // Get all pending records
    const pendingRecords = await this.getPendingRecords();

    if (method === 'google_drive') {
      await this.syncToGoogleDrive(pendingRecords);
    } else if (method === 'firestore') {
      await this.syncToFirestore(pendingRecords);
    }
  }

  /**
   * Get all pending records
   */
  private async getPendingRecords(): Promise<any[]> {
    const tables = ['businesses', 'books', 'entries', 'parties', 'categories', 'business_team'];
    const pendingRecords: any[] = [];

    for (const table of tables) {
      try {
        const records = await this.db.query(
          `SELECT * FROM ${table} WHERE sync_status = ?`,
          ['pending']
        );
        records.forEach((record: any) => {
          pendingRecords.push({ ...record, _table: table });
        });
      } catch (error) {
        console.error(`Error fetching pending records from ${table}:`, error);
      }
    }

    return pendingRecords;
  }

  /**
   * Sync to Google Drive
   */
  private async syncToGoogleDrive(records: any[]): Promise<void> {
    // Group records by table and business
    const recordsByPath: { [key: string]: any[] } = {};
    
    for (const record of records) {
      const table = record._table || 'unknown';
      const folderPath = await this.getFolderPathForRecord(table, record);
      const key = `${folderPath}_${table}`;
      
      if (!recordsByPath[key]) {
        recordsByPath[key] = [];
      }
      recordsByPath[key].push({ ...record, folderPath });
    }

    // Sync each group
    for (const [key, groupRecords] of Object.entries(recordsByPath)) {
      const folderPath = groupRecords[0].folderPath;
      const tableName = groupRecords[0]._table;

      try {
        // Create folder structure
        await this.googleDrive.createFolderStructure();

        // Upload each record
        for (const record of groupRecords) {
          const fileName = `${tableName}_${record.id}.json`;
          await this.googleDrive.uploadData(folderPath, fileName, record);
          
          // Update sync status
          await this.db.execute(
            `UPDATE ${tableName} SET sync_status = ? WHERE id = ?`,
            ['synced', record.id]
          );
        }
      } catch (error) {
        console.error(`Error syncing to Google Drive (${key}):`, error);
        // Mark as error
        for (const record of groupRecords) {
          await this.db.execute(
            `UPDATE ${record._table} SET sync_status = ? WHERE id = ?`,
            ['error', record.id]
          );
        }
      }
    }
  }

  /**
   * Sync to Firestore
   */
  private async syncToFirestore(records: any[]): Promise<void> {
    // Group records by table
    const recordsByTable: { [key: string]: any[] } = {};
    
    records.forEach(record => {
      const table = record._table || 'unknown';
      if (!recordsByTable[table]) {
        recordsByTable[table] = [];
      }
      recordsByTable[table].push(record);
    });

    // Sync each table
    for (const [tableName, tableRecords] of Object.entries(recordsByTable)) {
      const documents = tableRecords.map(record => ({
        id: record.id,
        data: record
      }));

      try {
        await this.firestore.batchSave(tableName, documents);
        
        // Update sync status
        for (const record of tableRecords) {
          await this.db.execute(
            `UPDATE ${tableName} SET sync_status = ? WHERE id = ?`,
            ['synced', record.id]
          );
        }
      } catch (error) {
        console.error(`Error syncing ${tableName} to Firestore:`, error);
        // Mark as error
        for (const record of tableRecords) {
          await this.db.execute(
            `UPDATE ${tableName} SET sync_status = ? WHERE id = ?`,
            ['error', record.id]
          );
        }
      }
    }
  }

  /**
   * Pull updates from cloud
   */
  async pullUpdates(): Promise<void> {
    const method = await this.getSyncMethod();
    
    if (method === 'none') {
      throw new Error('No sync method configured');
    }

    if (method === 'google_drive') {
      await this.pullFromGoogleDrive();
    } else if (method === 'firestore') {
      await this.pullFromFirestore();
    }
  }

  /**
   * Pull updates from Google Drive
   */
  private async pullFromGoogleDrive(): Promise<void> {
    // Get all businesses
    const businesses = await this.db.query('SELECT * FROM businesses WHERE is_deleted = 0');
    
    for (const business of businesses) {
      const folderPath = `/MyCashApp/businesses/${business.id}`;
      const files = await this.googleDrive.listFiles(folderPath);
      
      for (const file of files) {
        try {
          const data = await this.googleDrive.downloadData(file.id);
          await this.mergeData(data, file.table || 'unknown');
        } catch (error) {
          console.error(`Error pulling file ${file.id}:`, error);
        }
      }
    }
  }

  /**
   * Pull updates from Firestore
   */
  private async pullFromFirestore(): Promise<void> {
    // Subscribe to real-time updates for each collection
    const collections = ['businesses', 'books', 'entries', 'parties', 'categories', 'business_team'];
    
    for (const collectionName of collections) {
      this.firestore.subscribe(collectionName, async (data) => {
        for (const item of data) {
          await this.mergeData(item, collectionName);
        }
      });
    }
  }

  /**
   * Merge data from cloud into local database
   */
  private async mergeData(cloudData: any, tableName: string): Promise<void> {
    // Check if local record exists
    const localRecords = await this.db.query(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [cloudData.id]
    );

    if (localRecords.length === 0) {
      // Insert new record
      await this.insertRecord(tableName, cloudData);
    } else {
      const localRecord = localRecords[0];
      const localTime = new Date(localRecord.updated_at).getTime();
      const cloudTime = new Date(cloudData.updated_at).getTime();

      if (cloudTime > localTime) {
        // Cloud is newer, update local
        await this.updateRecord(tableName, cloudData);
      } else if (localTime > cloudTime && localRecord.sync_status === 'pending') {
        // Local is newer and pending, push to cloud
        await this.pushRecord(tableName, localRecord);
      }
    }
  }

  /**
   * Insert record into table
   */
  private async insertRecord(tableName: string, data: any): Promise<void> {
    // Dynamic insert based on table structure
    // This is a simplified version - in production, use proper mapping
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== '_table');
    const values = fields.map(f => data[f]);
    const placeholders = fields.map(() => '?').join(', ');

    await this.db.execute(
      `INSERT INTO ${tableName} (id, ${fields.join(', ')}) VALUES (?, ${placeholders})`,
      [data.id, ...values]
    );
  }

  /**
   * Update record in table
   */
  private async updateRecord(tableName: string, data: any): Promise<void> {
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== '_table');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);

    await this.db.execute(
      `UPDATE ${tableName} SET ${setClause}, sync_status = ? WHERE id = ?`,
      [...values, 'synced', data.id]
    );
  }

  /**
   * Push record to cloud
   */
  private async pushRecord(tableName: string, record: any): Promise<void> {
    const method = await this.getSyncMethod();
    
    if (method === 'google_drive') {
      const folderPath = await this.getFolderPathForRecord(tableName, record);
      const fileName = `${tableName}_${record.id}.json`;
      await this.googleDrive.uploadData(folderPath, fileName, record);
    } else if (method === 'firestore') {
      await this.firestore.save(tableName, record.id, record);
    }

    // Update sync status
    await this.db.execute(
      `UPDATE ${tableName} SET sync_status = ? WHERE id = ?`,
      ['synced', record.id]
    );
  }

  /**
   * Get folder path for record
   */
  private async getFolderPathForRecord(tableName: string, record: any): Promise<string> {
    if (tableName === 'businesses') {
      return `/MyCashApp/businesses/${record.id}`;
    } else if (tableName === 'books') {
      return `/MyCashApp/businesses/${record.business_id}/books/${record.id}`;
    } else if (tableName === 'entries') {
      // Get book to find business_id
      const books = await this.db.query('SELECT business_id FROM books WHERE id = ?', [record.book_id]);
      const businessId = books.length > 0 ? books[0].business_id : 'unknown';
      return `/MyCashApp/businesses/${businessId}/books/${record.book_id}`;
    } else {
      return `/MyCashApp/businesses/${record.business_id || 'unknown'}`;
    }
  }
}

