import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EntryService } from '../../../core/services/entry.service';
import { PartyService } from '../../../core/services/party.service';
import { CategoryService } from '../../../core/services/category.service';
import { BookService } from '../../../core/services/book.service';
import { Entry, EntryType, PaymentMode } from '../../../core/models/entry.model';
import { Party } from '../../../core/models/party.model';
import { Category } from '../../../core/models/category.model';
import { Book } from '../../../core/models/book.model';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-entry-create-edit',
  templateUrl: './entry-create-edit.page.html',
  styleUrls: ['./entry-create-edit.page.scss'],
  standalone: false,
})
export class EntryCreateEditPage implements OnInit {
  entryForm: FormGroup;
  entryId: string | null = null;
  isEditMode = false;
  parties: Party[] = [];
  categories: Category[] = [];
  attachmentPath: string | null = null;
  attachmentPreview: string | null = null;

  entryTypes: EntryType[] = ['cash_in', 'cash_out'];
  paymentModes: PaymentMode[] = ['cash', 'online', 'credit_card'];

  constructor(
    private formBuilder: FormBuilder,
    private entryService: EntryService,
    private partyService: PartyService,
    private categoryService: CategoryService,
    private bookService: BookService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.entryForm = this.formBuilder.group({
      type: ['cash_in', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      party_id: [''],
      category_id: [''],
      payment_mode: ['cash', Validators.required],
      date_time: [new Date().toISOString(), Validators.required],
      remarks: ['', Validators.maxLength(1000)]
    });
  }

  async ngOnInit() {
    this.entryId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.entryId;

    // Check if book is selected, if not, try to auto-select or prompt user
    if (!this.isEditMode) {
      const bookSelected = await this.ensureBookSelected();
      if (!bookSelected) {
        // No book selected and user was redirected, don't continue loading
        return;
      }
    }

    await this.loadParties();
    await this.loadCategories();

    if (this.isEditMode && this.entryId) {
      await this.loadEntry();
    }
  }

  /**
   * Ensure a book is selected before creating an entry
   * @returns true if book is selected (or was auto-selected), false if user needs to select
   */
  async ensureBookSelected(): Promise<boolean> {
    const currentBookId = await this.bookService.getCurrentBookId();
    
    if (currentBookId) {
      // Book is already selected, nothing to do
      return true;
    }

    // Try to get available books
    const books = await this.bookService.getBooks();
    
    if (books.length === 0) {
      // No books available, show alert and redirect
      const alert = await this.alertController.create({
        header: 'No Book Available',
        message: 'You need to create a book before adding entries. Would you like to create one now?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              this.router.navigate(['/home']);
            }
          },
          {
            text: 'Create Book',
            handler: () => {
              this.router.navigate(['/books']);
            }
          }
        ]
      });
      await alert.present();
      return false;
    }

    if (books.length === 1) {
      // Only one book exists, auto-select it
      await this.bookService.setCurrentBook(books[0].id);
      const toast = await this.toastController.create({
        message: `Using book: ${books[0].name}`,
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      return true;
    }

    // Multiple books available, prompt user to select
    const alert = await this.alertController.create({
      header: 'Select a Book',
      message: 'Please select a book to add entries to.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.router.navigate(['/home']);
          }
        },
        {
          text: 'Select Book',
          handler: () => {
            this.router.navigate(['/books']);
          }
        }
      ]
    });
    await alert.present();
    return false;
  }

  async loadParties() {
    try {
      this.parties = await this.partyService.getParties();
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  }

  async loadCategories() {
    try {
      this.categories = await this.categoryService.getCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadEntry() {
    if (!this.entryId) return;

    const loading = await this.loadingController.create({
      message: 'Loading entry...'
    });
    await loading.present();

    try {
      const entry = await this.entryService.getEntryById(this.entryId);
      if (entry) {
        this.entryForm.patchValue({
          type: entry.type,
          amount: entry.amount,
          party_id: entry.party_id || '',
          category_id: entry.category_id || '',
          payment_mode: entry.payment_mode,
          date_time: entry.date_time,
          remarks: entry.remarks || ''
        });

        if (entry.attachment_path) {
          this.attachmentPath = entry.attachment_path;
          await this.loadAttachmentPreview();
        }
      }
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load entry',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async capturePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        await this.saveAttachment(image.webPath);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  }

  async pickFile() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        await this.saveAttachment(image.webPath);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  }

  async saveAttachment(webPath: string) {
    const loading = await this.loadingController.create({
      message: 'Saving attachment...'
    });
    await loading.present();

    try {
      // Read file data
      const response = await fetch(webPath);
      const blob = await response.blob();
      const base64Data = await this.convertBlobToBase64(blob);

      // Save to filesystem
      const fileName = `entry_${Date.now()}.jpg`;
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      });

      this.attachmentPath = result.uri;
      await this.loadAttachmentPreview();

      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: 'Failed to save attachment',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async loadAttachmentPreview() {
    if (!this.attachmentPath) return;

    try {
      const file = await Filesystem.readFile({
        path: this.attachmentPath,
        directory: Directory.Data
      });
      this.attachmentPreview = `data:image/jpeg;base64,${file.data}`;
    } catch (error) {
      console.error('Error loading attachment preview:', error);
    }
  }

  async removeAttachment() {
    if (this.attachmentPath) {
      try {
        await Filesystem.deleteFile({
          path: this.attachmentPath,
          directory: Directory.Data
        });
      } catch (error) {
        console.error('Error deleting attachment:', error);
      }
    }
    this.attachmentPath = null;
    this.attachmentPreview = null;
  }

  convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  }

  async save() {
    if (this.entryForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditMode ? 'Updating entry...' : 'Saving entry...'
    });
    await loading.present();

    try {
      const formValue = this.entryForm.value;
      const entryData: Partial<Entry> = {
        type: formValue.type,
        amount: parseFloat(formValue.amount),
        party_id: formValue.party_id || undefined,
        category_id: formValue.category_id || undefined,
        payment_mode: formValue.payment_mode,
        date_time: formValue.date_time,
        remarks: formValue.remarks || undefined,
        attachment_path: this.attachmentPath || undefined
      };

      if (this.isEditMode && this.entryId) {
        await this.entryService.updateEntry(this.entryId, entryData);
        
        const toast = await this.toastController.create({
          message: 'Entry updated successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      } else {
        await this.entryService.createEntry(entryData);
        
        const toast = await this.toastController.create({
          message: 'Entry created successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }

      this.router.navigate(['/entries/list']);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to save entry',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async saveAndAddNew() {
    if (this.entryForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving entry...'
    });
    await loading.present();

    try {
      const formValue = this.entryForm.value;
      const entryData: Partial<Entry> = {
        type: formValue.type,
        amount: parseFloat(formValue.amount),
        party_id: formValue.party_id || undefined,
        category_id: formValue.category_id || undefined,
        payment_mode: formValue.payment_mode,
        date_time: formValue.date_time,
        remarks: formValue.remarks || undefined,
        attachment_path: this.attachmentPath || undefined
      };

      await this.entryService.createEntry(entryData);
      
      // Reset form but keep type and payment mode
      this.entryForm.patchValue({
        amount: 0,
        party_id: '',
        category_id: '',
        date_time: new Date().toISOString(),
        remarks: ''
      });
      this.attachmentPath = null;
      this.attachmentPreview = null;

      const toast = await this.toastController.create({
        message: 'Entry saved. Add another?',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to save entry',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}

