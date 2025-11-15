import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { BusinessService } from './business.service';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(
    private db: DatabaseService,
    private businessService: BusinessService
  ) {}

  /**
   * Create a new category
   */
  async createCategory(name: string, displayOrder?: number): Promise<Category> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error('No business selected');
    }

    // Get max display order if not provided
    if (displayOrder === undefined) {
      const maxOrder = await this.getMaxDisplayOrder();
      displayOrder = maxOrder + 1;
    }

    const categoryId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const category: Category = {
      id: categoryId,
      business_id: businessId,
      name,
      display_order: displayOrder,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await this.db.execute(
      'INSERT INTO categories (id, business_id, name, display_order, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category.id, category.business_id, category.name, category.display_order, category.created_at, category.updated_at, category.sync_status]
    );

    return category;
  }

  /**
   * Get all categories for current business
   */
  async getCategories(): Promise<Category[]> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      return [];
    }

    const categories = await this.db.query(
      'SELECT * FROM categories WHERE business_id = ? ORDER BY display_order ASC, name ASC',
      [businessId]
    );

    return categories as Category[];
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    const categories = await this.db.query(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return null;
    }

    const category = categories[0] as Category;
    
    // Validate that the category belongs to the current business
    const currentBusinessId = await this.businessService.getCurrentBusinessId();
    if (!currentBusinessId || category.business_id !== currentBusinessId) {
      return null;
    }

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<void> {
    // Validate that the category belongs to the current business
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found or does not belong to current business');
    }

    const now = this.db.getCurrentTimestamp();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.display_order !== undefined) {
      fields.push('display_order = ?');
      values.push(updates.display_order);
    }

    fields.push('updated_at = ?');
    fields.push('sync_status = ?');
    values.push(now);
    values.push('pending');
    values.push(categoryId);

    await this.db.execute(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    // Validate that the category belongs to the current business
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found or does not belong to current business');
    }

    // Check if category is used in entries
    const entries = await this.db.query(
      'SELECT COUNT(*) as count FROM entries WHERE category_id = ?',
      [categoryId]
    );

    if (entries[0]?.count > 0) {
      throw new Error('Cannot delete category that is used in entries');
    }

    await this.db.execute(
      'DELETE FROM categories WHERE id = ?',
      [categoryId]
    );
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryIds: string[]): Promise<void> {
    const queries = categoryIds.map((id, index) => ({
      sql: 'UPDATE categories SET display_order = ?, updated_at = ?, sync_status = ? WHERE id = ?',
      params: [index + 1, this.db.getCurrentTimestamp(), 'pending', id]
    }));

    await this.db.runTransaction(queries);
  }

  /**
   * Get max display order
   */
  private async getMaxDisplayOrder(): Promise<number> {
    const businessId = await this.businessService.getCurrentBusinessId();
    if (!businessId) {
      return 0;
    }

    const result = await this.db.query(
      'SELECT MAX(display_order) as max_order FROM categories WHERE business_id = ?',
      [businessId]
    );

    return result[0]?.max_order || 0;
  }
}

