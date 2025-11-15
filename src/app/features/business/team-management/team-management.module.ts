import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TeamManagementPageRoutingModule } from './team-management-routing.module';
import { TeamManagementPage } from './team-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TeamManagementPageRoutingModule
  ],
  declarations: [TeamManagementPage]
})
export class TeamManagementPageModule {}

