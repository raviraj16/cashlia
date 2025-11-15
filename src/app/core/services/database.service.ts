import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private dbName = 'cashlia_db';
  private db: SQLiteDBConnection | null = null;
  private sqlite: SQLiteConnection | null = null;
  private isService = false;
  private webStorage: Map<string, any[]> = new Map(); // Fallback storage for web

  constructor() {
    this.isService = Capacitor.getPlatform() !== 'web';
  }

  /**
   * Initialize database
   */
  async initializeDatabase(): Promise<void> {
    try {
      if (this.isService) {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
        await this.db.open();
        await this.createTables();
      } else {
        // For web platform, use localStorage fallback
        console.warn('SQLite not available on web platform, using localStorage fallback');
        await this.initializeWebStorage();
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Initialize web storage fallback
   */
  private async initializeWebStorage(): Promise<void> {
    // Initialize storage for each table
    const tables = ['users', 'businesses', 'business_team', 'books', 'entries', 'parties', 'categories', 'activity_logs', 'business_invitations'];
    for (const table of tables) {
      const stored = localStorage.getItem(`${this.dbName}_${table}`);
      if (!stored) {
        this.webStorage.set(table, []);
      } else {
        this.webStorage.set(table, JSON.parse(stored));
      }
    }
    console.log('Database initialized successfully');
  }

  /**
   * Create all database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT,
        password_hash TEXT,
        firebase_uid TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Businesses table
      `CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )`,

      // Business team table
      `CREATE TABLE IF NOT EXISTS business_team (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        invited_by TEXT,
        joined_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(business_id, user_id)
      )`,

      // Books table
      `CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,

      // Entries table
      `CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        party_id TEXT,
        category_id TEXT,
        payment_mode TEXT NOT NULL,
        date_time TEXT NOT NULL,
        remarks TEXT,
        attachment_path TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (party_id) REFERENCES parties(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,

      // Parties table
      `CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )`,

      // Activity logs table
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES entries(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      // Business invitations table
      `CREATE TABLE IF NOT EXISTS business_invitations (
        business_id TEXT NOT NULL,
        token TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`
    ];

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_business_team_business ON business_team(business_id)',
      'CREATE INDEX IF NOT EXISTS idx_business_team_user ON business_team(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_books_business ON books(business_id)',
      'CREATE INDEX IF NOT EXISTS idx_entries_book ON entries(book_id)',
      'CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date_time)',
      'CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type)',
      'CREATE INDEX IF NOT EXISTS idx_parties_business ON parties(business_id)',
      'CREATE INDEX IF NOT EXISTS idx_categories_business ON categories(business_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_entry ON activity_logs(entry_id)'
    ];

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    for (const table of tables) {
      await this.db.execute(table);
    }

    for (const index of indexes) {
      await this.db.execute(index);
    }
  }

  /**
   * Execute a query
   */
  async query(sql: string, params: any[] = []): Promise<any> {
    if (this.isService) {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      const result = await this.db.query(sql, params);
      return result.values || [];
    } else {
      // Web fallback: parse SQL and query from localStorage
      return this.webQuery(sql, params);
    }
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    if (this.isService) {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      return await this.db.run(sql, params);
    } else {
      // Web fallback: parse SQL and execute on localStorage
      return this.webExecute(sql, params);
    }
  }

  /**
   * Web fallback: Query from localStorage
   */
  private webQuery(sql: string, params: any[]): any[] {
    // Handle JOIN queries - extract the main table
    let tableMatch = sql.match(/FROM\s+(\w+)\s+(?:AS\s+)?\w*/i);
    if (!tableMatch) {
      // Try without alias
      tableMatch = sql.match(/FROM\s+(\w+)/i);
    }
    if (!tableMatch) return [];
    
    const table = tableMatch[1];
    // Always reload from localStorage to ensure we have the latest data
    const stored = localStorage.getItem(`${this.dbName}_${table}`);
    let data: any[] = [];
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch (error) {
        console.error(`Error parsing localStorage data for ${table}:`, error);
        data = [];
      }
    }
    // Update the in-memory Map as well
    this.webStorage.set(table, data);
    
    // Debug logging for book and entry queries
    if (table === 'books') {
      console.log(`Querying books table. Found ${data.length} books in storage.`);
      console.log('Query SQL:', sql);
      console.log('Query params:', params);
      console.log('All books:', data);
    }
    if (table === 'entries') {
      console.log(`Querying entries table. Found ${data.length} entries in storage.`);
      console.log('Query SQL:', sql);
      console.log('Query params:', params);
      console.log('All entries:', data);
    }
    
    // For queries with JOINs, we need to handle them differently
    // For now, if there's a JOIN, we'll just query the main table and filter
    const hasJoin = /JOIN/i.test(sql);
    
    // Simple WHERE clause parsing
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      let paramIndex = 0;
      
      // Check if it's an OR condition
      if (whereClause.includes(' OR ')) {
        // Handle OR conditions - at least one condition must match
        const orConditions = whereClause.split(' OR ').map(c => c.trim());
        data = data.filter((row: any) => {
          let localParamIndex = 0;
          return orConditions.some(cond => {
            return this.evaluateCondition(cond, row, params, () => localParamIndex++);
          });
        });
      } else {
        // Handle AND conditions - all conditions must match
        // Split by AND, but be careful with IN clauses that might contain AND
        const andConditions: string[] = [];
        let currentCondition = '';
        let parenDepth = 0;
        
        for (let i = 0; i < whereClause.length; i++) {
          const char = whereClause[i];
          if (char === '(') parenDepth++;
          if (char === ')') parenDepth--;
          
          // Check for ' AND ' (with spaces on both sides)
          if (char === ' ' && i + 5 <= whereClause.length) {
            const substr = whereClause.substring(i, i + 5);
            if (substr === ' AND ' && parenDepth === 0) {
              if (currentCondition.trim()) {
                andConditions.push(currentCondition.trim());
              }
              currentCondition = '';
              i += 4; // Skip ' AND ' (we'll increment i++ in the loop, so skip 4 chars)
              continue;
            }
          }
          currentCondition += char;
        }
        if (currentCondition.trim()) {
          andConditions.push(currentCondition.trim());
        }
        
        // Debug logging for book and entry queries
        if (table === 'books' || table === 'entries') {
          console.log(`Split AND conditions for ${table}:`, andConditions);
        }
        
        data = data.filter((row: any) => {
          // Reset param index for each row evaluation (each row uses the same params)
          let paramIndex = 0;
          const matches = andConditions.every(cond => {
            const result = this.evaluateCondition(cond, row, params, () => paramIndex++);
            // Debug logging for book and entry queries
            if (table === 'books' && !result) {
              console.log(`Book ${row.id} (${row.name}) did not match condition: ${cond}`, {
                row,
                condition: cond,
                params,
                paramIndex: paramIndex - 1
              });
            }
            if (table === 'entries' && !result) {
              console.log(`Entry ${row.id} did not match condition: ${cond}`, {
                row,
                condition: cond,
                params,
                paramIndex: paramIndex - 1
              });
            }
            return result;
          });
          return matches;
        });
        
        // Debug logging for book and entry queries
        if (table === 'books') {
          console.log(`After filtering, found ${data.length} books matching conditions`);
        }
        if (table === 'entries') {
          console.log(`After filtering, found ${data.length} entries matching conditions`);
        }
      }
    }
    
    // Handle ORDER BY clause
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)?/i);
    if (orderMatch) {
      const orderField = orderMatch[1];
      const orderDirection = (orderMatch[2] || 'ASC').toUpperCase();
      
      data.sort((a: any, b: any) => {
        let aValue = a[orderField];
        let bValue = b[orderField];
        
        // Handle date strings
        if (orderField.includes('_at') || orderField.includes('date') || orderField.includes('time')) {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        if (orderDirection === 'DESC') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });
    }
    
    return data;
  }

  /**
   * Evaluate a single condition (field = value, field = ?, or field IN (...))
   */
  private evaluateCondition(condition: string, row: any, params: any[], getParamIndex: () => number): boolean {
    // Handle always-true conditions like 1=1
    const trimmedCondition = condition.trim();
    if (trimmedCondition === '1=1' || trimmedCondition === '1 = 1') {
      return true;
    }
    // Handle always-false conditions like 1=0
    if (trimmedCondition === '1=0' || trimmedCondition === '1 = 0') {
      return false;
    }
    
    // Handle IN clause (field IN (?, ?, ?))
    if (condition.includes(' IN ')) {
      const inMatch = condition.match(/(\w+)\s+IN\s*\((.+?)\)/i);
      if (inMatch) {
        const cleanField = inMatch[1].replace(/[`"]/g, '');
        const inValues = inMatch[2].split(',').map(v => v.trim());
        const rowValue = row[cleanField];
        
        // Check if rowValue matches any of the IN values
        return inValues.some(valuePart => {
          let expectedValue: any;
          if (valuePart === '?') {
            const index = getParamIndex();
            expectedValue = params[index];
          } else {
            const numValue = parseFloat(valuePart);
            expectedValue = isNaN(numValue) ? valuePart.replace(/['"]/g, '') : numValue;
          }
          
          // Handle type conversion
          let convertedRowValue = rowValue;
          if (typeof expectedValue === 'number' && typeof rowValue === 'string') {
            convertedRowValue = parseFloat(rowValue);
          } else if (typeof expectedValue === 'string' && typeof rowValue === 'number') {
            convertedRowValue = String(rowValue);
          }
          
          return convertedRowValue === expectedValue;
        });
      }
    }
    
    // Handle equality condition (field = value or field = ?)
    if (condition.includes('=')) {
      const parts = condition.split('=').map(s => s.trim());
      if (parts.length === 2) {
        const cleanField = parts[0].replace(/[`"]/g, '');
        let expectedValue: any;
        
        if (parts[1] === '?') {
          const index = getParamIndex();
          expectedValue = params[index];
        } else {
          // Handle literal values (numbers and strings)
          // Try to parse as number first, but handle the case where it's actually 0
          const trimmedValue = parts[1].trim();
          if (trimmedValue === '0' || trimmedValue === '1') {
            // Explicitly handle 0 and 1 as numbers
            expectedValue = parseInt(trimmedValue, 10);
          } else {
            const numValue = parseFloat(trimmedValue);
            expectedValue = isNaN(numValue) ? trimmedValue.replace(/['"]/g, '') : numValue;
          }
        }
        
        let rowValue = row[cleanField];
        // Handle type conversion for comparison
        // Special handling for numeric 0/1 comparisons
        if (expectedValue === 0 || expectedValue === 1) {
          // Convert rowValue to number for comparison
          if (typeof rowValue === 'string') {
            rowValue = parseInt(rowValue, 10);
          }
        } else if (typeof expectedValue === 'number' && typeof rowValue === 'string') {
          rowValue = parseFloat(rowValue);
        } else if (typeof expectedValue === 'string' && typeof rowValue === 'number') {
          rowValue = String(rowValue);
        }
        
        return rowValue === expectedValue;
      }
    }
    return false;
  }

  /**
   * Web fallback: Execute SQL on localStorage
   */
  private webExecute(sql: string, params: any[]): any {
    const upperSql = sql.toUpperCase().trim();
    let paramIndex = 0;
    
    if (upperSql.startsWith('INSERT')) {
      const tableMatch = sql.match(/INTO\s+(\w+)/i);
      if (!tableMatch) return { changes: { changes: 0 } };
      
      const table = tableMatch[1];
      const columnsMatch = sql.match(/\(([^)]+)\)/);
      const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/);
      
      if (columnsMatch && valuesMatch) {
        const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
        const valuesParts = valuesMatch[1].split(',').map(v => v.trim());
        
        const row: any = {};
        columns.forEach((col, i) => {
          const valuePart = valuesParts[i];
          if (valuePart === '?') {
            row[col] = params[paramIndex++];
          } else {
            // Handle numeric and string literals
            const numValue = parseFloat(valuePart);
            row[col] = isNaN(numValue) ? valuePart.replace(/^['"]|['"]$/g, '') : numValue;
          }
        });
        
        // Always reload from localStorage first to ensure we have the latest data
        const stored = localStorage.getItem(`${this.dbName}_${table}`);
        let data: any[] = [];
        if (stored) {
          try {
            data = JSON.parse(stored);
          } catch (error) {
            console.error(`Error parsing localStorage data for ${table}:`, error);
            data = [];
          }
        }
        // Update the in-memory Map as well
        this.webStorage.set(table, data);
        
        // Handle INSERT OR REPLACE - check if row with same primary key exists
        const isReplace = upperSql.includes('OR REPLACE');
        if (isReplace && row.id) {
          const existingIndex = data.findIndex((r: any) => r.id === row.id);
          if (existingIndex >= 0) {
            data[existingIndex] = row;
          } else {
            data.push(row);
          }
        } else {
          data.push(row);
        }
        
        this.webStorage.set(table, data);
        localStorage.setItem(`${this.dbName}_${table}`, JSON.stringify(data));
        
        // Debug logging for book and entry inserts
        if (table === 'books') {
          console.log('Book inserted:', row);
          console.log('All books in storage:', data);
        }
        if (table === 'entries') {
          console.log('Entry inserted:', row);
          console.log('All entries in storage:', data);
        }
        
        return { changes: { changes: 1, lastId: row.id || data.length } };
      }
    } else if (upperSql.startsWith('UPDATE')) {
      const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
      if (!tableMatch) return { changes: { changes: 0 } };
      
      const table = tableMatch[1];
      const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
      const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
      
      if (setMatch) {
        let data = this.webStorage.get(table) || [];
        const setClause = setMatch[1];
        const updates: any = {};
        
        setClause.split(',').forEach(part => {
          const [key, value] = part.split('=').map(s => s.trim());
          const cleanKey = key.replace(/[`"]/g, '');
          if (value === '?') {
            updates[cleanKey] = params[paramIndex++];
          } else {
            // Handle numeric and string literals
            const numValue = parseFloat(value);
            updates[cleanKey] = isNaN(numValue) ? value.replace(/['"]/g, '') : numValue;
          }
        });
        
        if (whereMatch) {
          const whereClause = whereMatch[1];
          // Handle WHERE id = ? pattern
          const whereParts = whereClause.split('=').map(s => s.trim());
          if (whereParts.length === 2) {
            const cleanField = whereParts[0].replace(/[`"]/g, '');
            let paramValue: any;
            
            if (whereParts[1] === '?') {
              paramValue = params[paramIndex];
            } else {
              // Handle literal values
              const numValue = parseFloat(whereParts[1]);
              paramValue = isNaN(numValue) ? whereParts[1].replace(/['"]/g, '') : numValue;
            }
            
            let changes = 0;
            data = data.map((row: any) => {
              // Handle type conversion for comparison
              let rowValue = row[cleanField];
              if (typeof paramValue === 'number' && typeof rowValue === 'string') {
                rowValue = parseFloat(rowValue);
              } else if (typeof paramValue === 'string' && typeof rowValue === 'number') {
                paramValue = String(paramValue);
              }
              
              if (rowValue === paramValue) {
                changes++;
                return { ...row, ...updates };
              }
              return row;
            });
            
            this.webStorage.set(table, data);
            localStorage.setItem(`${this.dbName}_${table}`, JSON.stringify(data));
            return { changes: { changes } };
          }
        }
      }
    } else if (upperSql.startsWith('DELETE')) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (!tableMatch) return { changes: { changes: 0 } };
      
      const table = tableMatch[1];
      const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
      
      if (whereMatch) {
        let data = this.webStorage.get(table) || [];
        const whereClause = whereMatch[1];
        const [field, value] = whereClause.split('=').map(s => s.trim());
        const cleanField = field.replace(/[`"]/g, '');
        const paramValue = value === '?' ? params[paramIndex] : value.replace(/['"]/g, '');
        
        const originalLength = data.length;
        data = data.filter((row: any) => row[cleanField] !== paramValue);
        const changes = originalLength - data.length;
        
        this.webStorage.set(table, data);
        localStorage.setItem(`${this.dbName}_${table}`, JSON.stringify(data));
        return { changes: { changes } };
      }
    }
    
    return { changes: { changes: 0 } };
  }

  /**
   * Run a transaction
   */
  async runTransaction(queries: Array<{ sql: string; params: any[] }>): Promise<void> {
    if (this.isService) {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      try {
        await this.db.beginTransaction();
        
        for (const query of queries) {
          await this.db.run(query.sql, query.params);
        }
        
        await this.db.commitTransaction();
      } catch (error) {
        await this.db.rollbackTransaction();
        throw error;
      }
    } else {
      // Web fallback: execute all queries sequentially
      try {
        for (const query of queries) {
          await this.webExecute(query.sql, query.params);
        }
      } catch (error) {
        // Simple rollback: reload from localStorage
        await this.initializeWebStorage();
        throw error;
      }
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  /**
   * Generate UUID
   */
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get current timestamp
   */
  getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}

