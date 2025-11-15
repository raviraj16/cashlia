import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntryService } from '../../../core/services/entry.service';
import { PartyService } from '../../../core/services/party.service';
import { CategoryService } from '../../../core/services/category.service';
import { Entry, ActivityLog } from '../../../core/models/entry.model';
import { Party } from '../../../core/models/party.model';
import { Category } from '../../../core/models/category.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-entry-detail',
  templateUrl: './entry-detail.page.html',
  styleUrls: ['./entry-detail.page.scss'],
  standalone: false,
})
export class EntryDetailPage implements OnInit {
  entry: Entry | null = null;
  activityLogs: ActivityLog[] = [];
  attachmentPreview: string | null = null;
  party: Party | null = null;
  category: Category | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entryService: EntryService,
    private partyService: PartyService,
    private categoryService: CategoryService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    const entryId = this.route.snapshot.paramMap.get('id');
    if (entryId) {
      await this.loadEntry(entryId);
      await this.loadActivityLogs(entryId);
    }
  }

  async loadEntry(entryId: string) {
    const loading = await this.loadingController.create({
      message: 'Loading entry...'
    });
    await loading.present();

    try {
      this.entry = await this.entryService.getEntryById(entryId);
      if (this.entry) {
        // Load party and category if they exist
        if (this.entry.party_id) {
          this.party = await this.partyService.getPartyById(this.entry.party_id);
        }
        if (this.entry.category_id) {
          this.category = await this.categoryService.getCategoryById(this.entry.category_id);
        }
        
        if (this.entry.attachment_path) {
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

  async loadActivityLogs(entryId: string) {
    try {
      this.activityLogs = await this.entryService.getActivityLogs(entryId);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  }

  async loadAttachmentPreview() {
    if (!this.entry?.attachment_path) return;

    try {
      const file = await Filesystem.readFile({
        path: this.entry.attachment_path,
        directory: Directory.Data
      });
      this.attachmentPreview = `data:image/jpeg;base64,${file.data}`;
    } catch (error) {
      console.error('Error loading attachment preview:', error);
    }
  }

  async editEntry() {
    if (this.entry) {
      this.router.navigate(['/entries/edit', this.entry.id]);
    }
  }

  async deleteEntry() {
    if (!this.entry) return;

    const alert = await this.alertController.create({
      header: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This action cannot be undone.',
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
              message: 'Deleting entry...'
            });
            await loading.present();

            try {
              if (!this.entry?.id) {
                return false;
              }
              await this.entryService.deleteEntry(this.entry.id);
              
              const toast = await this.toastController.create({
                message: 'Entry deleted successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();

              this.router.navigate(['/entries/list']);
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to delete entry',
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  parseActivityLogDetails(log: ActivityLog): { changes?: Array<{ field: string; oldValue: any; newValue: any }> } | null {
    if (!log.details) {
      return null;
    }

    try {
      const parsed = JSON.parse(log.details);
      return parsed;
    } catch (error) {
      // If parsing fails, return null (it's just a plain string)
      return null;
    }
  }

  hasChangeDetails(log: ActivityLog): boolean {
    const parsed = this.parseActivityLogDetails(log);
    return parsed !== null && parsed.changes !== undefined && parsed.changes.length > 0;
  }
}

