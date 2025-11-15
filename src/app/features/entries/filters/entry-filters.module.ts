import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { EntryFiltersPageRoutingModule } from './entry-filters-routing.module';
import { EntryFiltersPage } from './entry-filters.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EntryFiltersPageRoutingModule
  ],
  declarations: [EntryFiltersPage]
})
export class EntryFiltersPageModule {}

