import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { BusinessService } from './business.service';
import { Book } from '../models/book.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private readonly CURRENT_BOOK_KEY = 'current_book_id';
  private currentBookId: string | null = null;

  constructor(
    private db: DatabaseService,
    private authService: AuthService,
    private businessService: BusinessService
  ) {}

  /**
   * Create a new book
   */
  async createBook(name: string): Promise<Book> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error('No business selected');
    }

    const bookId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const book: Book = {
      id: bookId,
      business_id: businessId,
      name,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      is_deleted: 0,
      sync_status: 'pending'
    };

    await this.db.execute(
      'INSERT INTO books (id, business_id, name, created_by, created_at, updated_at, is_deleted, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [book.id, book.business_id, book.name, book.created_by, book.created_at, book.updated_at, book.is_deleted, book.sync_status]
    );

    // Set as current book if no current book
    const currentBookId = await this.getCurrentBookId();
    if (!currentBookId) {
      await this.setCurrentBook(bookId);
    }

    return book;
  }

  /**
   * Get all books for current business
   */
  async getBooks(): Promise<Book[]> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      return [];
    }

    const books = await this.db.query(
      'SELECT * FROM books WHERE business_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
      [businessId]
    );

    return books as Book[];
  }

  /**
   * Get book by ID
   */
  async getBookById(bookId: string): Promise<Book | null> {
    const books = await this.db.query(
      'SELECT * FROM books WHERE id = ? AND is_deleted = 0',
      [bookId]
    );

    if (books.length === 0) {
      return null;
    }

    const book = books[0] as Book;
    
    // Validate that the book belongs to the current business
    const currentBusinessId = await this.businessService.getCurrentBusinessId();
    if (!currentBusinessId || book.business_id !== currentBusinessId) {
      return null;
    }

    return book;
  }

  /**
   * Update book
   */
  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    // Validate that the book belongs to the current business
    const book = await this.getBookById(bookId);
    if (!book) {
      throw new Error('Book not found or does not belong to current business');
    }

    const now = this.db.getCurrentTimestamp();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(bookId);

    await this.db.execute(
      `UPDATE books SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete book (soft delete)
   */
  async deleteBook(bookId: string): Promise<void> {
    // Validate that the book belongs to the current business
    const book = await this.getBookById(bookId);
    if (!book) {
      throw new Error('Book not found or does not belong to current business');
    }

    const now = this.db.getCurrentTimestamp();
    await this.db.execute(
      'UPDATE books SET is_deleted = 1, updated_at = ?, sync_status = ? WHERE id = ?',
      [now, 'pending', bookId]
    );

    // Clear current book if deleted
    if (this.currentBookId === bookId) {
      await this.clearCurrentBook();
    }
  }

  /**
   * Clone book with entries
   */
  async cloneBook(bookId: string, newName: string): Promise<Book> {
    const originalBook = await this.getBookById(bookId);
    if (!originalBook) {
      throw new Error('Book not found');
    }

    // Create new book
    const newBook = await this.createBook(newName);

    // Clone entries
    const entries = await this.db.query(
      'SELECT * FROM entries WHERE book_id = ?',
      [bookId]
    );

    if (entries.length > 0) {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const now = this.db.getCurrentTimestamp();
      const queries = entries.map((entry: any) => ({
        sql: `INSERT INTO entries (id, book_id, type, amount, party_id, category_id, payment_mode, date_time, remarks, attachment_path, created_by, created_at, updated_at, sync_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          this.db.generateUUID(),
          newBook.id,
          entry.type,
          entry.amount,
          entry.party_id,
          entry.category_id,
          entry.payment_mode,
          entry.date_time,
          entry.remarks,
          entry.attachment_path,
          user.id,
          now,
          now,
          'pending'
        ]
      }));

      await this.db.runTransaction(queries);
    }

    return newBook;
  }

  /**
   * Set current book
   */
  async setCurrentBook(bookId: string): Promise<void> {
    this.currentBookId = bookId;
    await Preferences.set({
      key: this.CURRENT_BOOK_KEY,
      value: bookId
    });
  }

  /**
   * Get current book
   */
  async getCurrentBook(): Promise<Book | null> {
    if (!this.currentBookId) {
      const stored = await Preferences.get({ key: this.CURRENT_BOOK_KEY });
      if (stored.value) {
        this.currentBookId = stored.value;
      }
    }

    if (this.currentBookId) {
      const book = await this.getBookById(this.currentBookId);
      
      // Validate that the book belongs to the current business
      if (book) {
        const currentBusinessId = await this.businessService.getCurrentBusinessId();
        if (!currentBusinessId || book.business_id !== currentBusinessId) {
          // Book doesn't belong to current business, clear it
          await this.clearCurrentBook();
          return null;
        }
        
        // Additional validation: ensure the business belongs to the current user
        const currentBusiness = await this.businessService.getCurrentBusiness();
        if (!currentBusiness) {
          // No valid business, clear book
          await this.clearCurrentBook();
          return null;
        }
      } else {
        // Book not found, clear selection
        await this.clearCurrentBook();
        return null;
      }
      
      return book;
    }

    return null;
  }

  /**
   * Get current book ID
   */
  async getCurrentBookId(): Promise<string | null> {
    if (!this.currentBookId) {
      const stored = await Preferences.get({ key: this.CURRENT_BOOK_KEY });
      if (stored.value) {
        this.currentBookId = stored.value;
      }
    }
    
    // Validate that the book belongs to the current business
    if (this.currentBookId) {
      const book = await this.getBookById(this.currentBookId);
      if (book) {
        const currentBusinessId = await this.businessService.getCurrentBusinessId();
        if (currentBusinessId && book.business_id !== currentBusinessId) {
          // Book doesn't belong to current business, clear it
          await this.clearCurrentBook();
          return null;
        }
      } else {
        // Book not found, clear it
        await this.clearCurrentBook();
        return null;
      }
    }
    
    return this.currentBookId;
  }

  /**
   * Clear current book
   */
  async clearCurrentBook(): Promise<void> {
    this.currentBookId = null;
    await Preferences.remove({ key: this.CURRENT_BOOK_KEY });
  }
}

