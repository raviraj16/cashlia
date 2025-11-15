import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookCreateEditPageRoutingModule } from './book-create-edit-routing.module';
import { BookCreateEditPage } from './book-create-edit.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BookCreateEditPageRoutingModule
  ],
  declarations: [BookCreateEditPage]
})
export class BookCreateEditPageModule {}

