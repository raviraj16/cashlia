import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SyncSettingsPageRoutingModule } from './sync-settings-routing.module';
import { SyncSettingsPage } from './sync-settings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SyncSettingsPageRoutingModule
  ],
  declarations: [SyncSettingsPage]
})
export class SyncSettingsPageModule {}

