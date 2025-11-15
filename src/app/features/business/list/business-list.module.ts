import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BusinessListPageRoutingModule } from './business-list-routing.module';
import { BusinessListPage } from './business-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BusinessListPageRoutingModule
  ],
  declarations: [BusinessListPage]
})
export class BusinessListPageModule {}

