import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SecuritySettingsPageRoutingModule } from './security-settings-routing.module';
import { SecuritySettingsPage } from './security-settings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SecuritySettingsPageRoutingModule
  ],
  declarations: [SecuritySettingsPage]
})
export class SecuritySettingsPageModule {}

