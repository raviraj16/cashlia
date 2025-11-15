import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BusinessService } from '../../../core/services/business.service';
import { BookService } from '../../../core/services/book.service';
import { Business } from '../../../core/models/business.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-business-list',
  templateUrl: './business-list.page.html',
  styleUrls: ['./business-list.page.scss'],
  standalone: false,
})
export class BusinessListPage implements OnInit {
  businesses: Business[] = [];
  currentBusiness: Business | null = null;

  constructor(
    private businessService: BusinessService,
    private bookService: BookService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadBusinesses();
    this.currentBusiness = await this.businessService.getCurrentBusiness();
  }

  /**
   * Called every time the page is about to enter
   * This ensures the list refreshes when navigating back from create/edit
   */
  async ionViewWillEnter() {
    // Refresh businesses list without showing loading (silent refresh)
    await this.loadBusinesses(false);
    this.currentBusiness = await this.businessService.getCurrentBusiness();
  }

  async loadBusinesses(showLoading: boolean = true) {
    const loading = showLoading ? await this.loadingController.create({
      message: 'Loading businesses...'
    }) : null;
    
    if (loading) {
      await loading.present();
    }

    try {
      this.businesses = await this.businessService.getBusinesses();
      this.currentBusiness = await this.businessService.getCurrentBusiness();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load businesses',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  async selectBusiness(business: Business) {
    // Get current book before switching
    const currentBook = await this.bookService.getCurrentBook();
    
    // Switch business
    await this.businessService.setCurrentBusiness(business.id);
    this.currentBusiness = business;
    
    // Clear current book if it doesn't belong to the new business
    if (currentBook && currentBook.business_id !== business.id) {
      await this.bookService.clearCurrentBook();
    }
    
    const toast = await this.toastController.create({
      message: `Switched to ${business.name}`,
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    // Navigate to home or refresh
    this.router.navigate(['/home']);
  }

  async createBusiness() {
    this.router.navigate(['/business/create']);
  }

  async editBusiness(business: Business, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/business/edit', business.id]);
  }

  async manageTeam(business: Business, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/business/team', business.id]);
  }

  async deleteBusiness(business: Business, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Delete Business',
      message: `Are you sure you want to delete "${business.name}"? This action cannot be undone.`,
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
              message: 'Deleting business...'
            });
            await loading.present();

            try {
              await this.businessService.deleteBusiness(business.id);
              await this.loadBusinesses();
              
              const toast = await this.toastController.create({
                message: 'Business deleted successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to delete business',
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

  isCurrentBusiness(business: Business): boolean {
    return this.currentBusiness?.id === business.id;
  }
}

