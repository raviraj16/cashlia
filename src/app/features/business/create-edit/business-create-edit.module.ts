import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BusinessCreateEditPageRoutingModule } from './business-create-edit-routing.module';
import { BusinessCreateEditPage } from './business-create-edit.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BusinessCreateEditPageRoutingModule
  ],
  declarations: [BusinessCreateEditPage]
})
export class BusinessCreateEditPageModule {}

