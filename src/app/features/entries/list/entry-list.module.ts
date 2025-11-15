import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { EntryListPageRoutingModule } from './entry-list-routing.module';
import { EntryListPage } from './entry-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EntryListPageRoutingModule
  ],
  declarations: [EntryListPage]
})
export class EntryListPageModule {}

