import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { EntryCreateEditPageRoutingModule } from './entry-create-edit-routing.module';
import { EntryCreateEditPage } from './entry-create-edit.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    EntryCreateEditPageRoutingModule
  ],
  declarations: [EntryCreateEditPage]
})
export class EntryCreateEditPageModule {}

