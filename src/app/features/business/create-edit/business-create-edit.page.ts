import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BusinessService } from '../../../core/services/business.service';
import { Business } from '../../../core/models/business.model';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-business-create-edit',
  templateUrl: './business-create-edit.page.html',
  styleUrls: ['./business-create-edit.page.scss'],
  standalone: false,
})
export class BusinessCreateEditPage implements OnInit {
  businessForm: FormGroup;
  businessId: string | null = null;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private businessService: BusinessService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.businessForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  async ngOnInit() {
    this.businessId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.businessId;

    if (this.isEditMode && this.businessId) {
      await this.loadBusiness();
    }
  }

  async loadBusiness() {
    if (!this.businessId) return;

    const loading = await this.loadingController.create({
      message: 'Loading business...'
    });
    await loading.present();

    try {
      const business = await this.businessService.getBusinessById(this.businessId);
      if (business) {
        this.businessForm.patchValue({
          name: business.name
        });
      }
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load business',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async save() {
    if (this.businessForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditMode ? 'Updating business...' : 'Creating business...'
    });
    await loading.present();

    try {
      if (this.isEditMode && this.businessId) {
        await this.businessService.updateBusiness(this.businessId, {
          name: this.businessForm.value.name
        });
        
        const toast = await this.toastController.create({
          message: 'Business updated successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      } else {
        const business = await this.businessService.createBusiness(this.businessForm.value.name);
        
        const toast = await this.toastController.create({
          message: 'Business created successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }

      this.router.navigate(['/business']);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to save business',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}

