import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-category-crud',
  templateUrl: './category-crud.page.html',
  styleUrls: ['./category-crud.page.scss'],
  standalone: false,
})
export class CategoryCrudPage implements OnInit {
  categories: Category[] = [];

  constructor(
    private categoryService: CategoryService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadCategories();
  }

  async loadCategories() {
    const loading = await this.loadingController.create({
      message: 'Loading categories...'
    });
    await loading.present();

    try {
      this.categories = await this.categoryService.getCategories();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load categories',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async createCategory() {
    const alert = await this.alertController.create({
      header: 'Create Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Category name',
          attributes: {
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (data) => {
            if (!data.name || !data.name.trim()) {
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Creating category...'
            });
            await loading.present();

            try {
              await this.categoryService.createCategory(data.name.trim());
              await this.loadCategories();
              
              const toast = await this.toastController.create({
                message: 'Category created successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to create category',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async editCategory(category: Category) {
    const alert = await this.alertController.create({
      header: 'Edit Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: category.name,
          placeholder: 'Category name',
          attributes: {
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: async (data) => {
            if (!data.name || !data.name.trim()) {
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Updating category...'
            });
            await loading.present();

            try {
              await this.categoryService.updateCategory(category.id, {
                name: data.name.trim()
              });
              await this.loadCategories();
              
              const toast = await this.toastController.create({
                message: 'Category updated successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to update category',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteCategory(category: Category) {
    const alert = await this.alertController.create({
      header: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting category...'
            });
            await loading.present();

            try {
              await this.categoryService.deleteCategory(category.id);
              await this.loadCategories();
              
              const toast = await this.toastController.create({
                message: 'Category deleted successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to delete category',
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

  async moveUp(category: Category, index: number) {
    if (index === 0) return;

    const categories = [...this.categories];
    [categories[index], categories[index - 1]] = [categories[index - 1], categories[index]];
    
    const categoryIds = categories.map(c => c.id);
    await this.reorderCategories(categoryIds);
  }

  async moveDown(category: Category, index: number) {
    if (index === this.categories.length - 1) return;

    const categories = [...this.categories];
    [categories[index], categories[index + 1]] = [categories[index + 1], categories[index]];
    
    const categoryIds = categories.map(c => c.id);
    await this.reorderCategories(categoryIds);
  }

  async reorderCategories(categoryIds: string[]) {
    const loading = await this.loadingController.create({
      message: 'Reordering categories...'
    });
    await loading.present();

    try {
      await this.categoryService.reorderCategories(categoryIds);
      await this.loadCategories();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to reorder categories',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}

