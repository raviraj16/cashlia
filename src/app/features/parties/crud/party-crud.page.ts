import { Component, OnInit } from '@angular/core';
import { PartyService } from '../../../core/services/party.service';
import { Party } from '../../../core/models/party.model';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-party-crud',
  templateUrl: './party-crud.page.html',
  styleUrls: ['./party-crud.page.scss'],
  standalone: false,
})
export class PartyCrudPage implements OnInit {
  parties: Party[] = [];
  searchTerm = '';

  constructor(
    private partyService: PartyService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    await this.loadParties();
  }

  async loadParties() {
    const loading = await this.loadingController.create({
      message: 'Loading parties...'
    });
    await loading.present();

    try {
      if (this.searchTerm) {
        this.parties = await this.partyService.searchParties(this.searchTerm);
      } else {
        this.parties = await this.partyService.getParties();
      }
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load parties',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    await this.loadParties();
  }

  async createParty() {
    const alert = await this.alertController.create({
      header: 'Create Party',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Party name',
          attributes: {
            required: true
          }
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone number (optional)'
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
              message: 'Creating party...'
            });
            await loading.present();

            try {
              await this.partyService.createParty(data.name.trim(), data.phone?.trim());
              await this.loadParties();
              
              const toast = await this.toastController.create({
                message: 'Party created successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to create party',
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

  async editParty(party: Party) {
    const alert = await this.alertController.create({
      header: 'Edit Party',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: party.name,
          placeholder: 'Party name',
          attributes: {
            required: true
          }
        },
        {
          name: 'phone',
          type: 'tel',
          value: party.phone || '',
          placeholder: 'Phone number (optional)'
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
              message: 'Updating party...'
            });
            await loading.present();

            try {
              await this.partyService.updateParty(party.id, {
                name: data.name.trim(),
                phone: data.phone?.trim() || undefined
              });
              await this.loadParties();
              
              const toast = await this.toastController.create({
                message: 'Party updated successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to update party',
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

  async deleteParty(party: Party) {
    const alert = await this.alertController.create({
      header: 'Delete Party',
      message: `Are you sure you want to delete "${party.name}"?`,
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
              message: 'Deleting party...'
            });
            await loading.present();

            try {
              await this.partyService.deleteParty(party.id);
              await this.loadParties();
              
              const toast = await this.toastController.create({
                message: 'Party deleted successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to delete party',
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
}

