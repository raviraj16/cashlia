import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppLockPageRoutingModule } from './app-lock-routing.module';
import { AppLockPage } from './app-lock.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AppLockPageRoutingModule
  ],
  declarations: [AppLockPage]
})
export class AppLockPageModule {}

