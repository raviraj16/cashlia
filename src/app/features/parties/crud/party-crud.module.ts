import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PartyCrudPageRoutingModule } from './party-crud-routing.module';
import { PartyCrudPage } from './party-crud.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PartyCrudPageRoutingModule
  ],
  declarations: [PartyCrudPage]
})
export class PartyCrudPageModule {}

