import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CategoryCrudPageRoutingModule } from './category-crud-routing.module';
import { CategoryCrudPage } from './category-crud.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CategoryCrudPageRoutingModule
  ],
  declarations: [CategoryCrudPage]
})
export class CategoryCrudPageModule {}

