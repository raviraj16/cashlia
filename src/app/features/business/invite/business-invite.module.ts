import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BusinessInvitePageRoutingModule } from './business-invite-routing.module';
import { BusinessInvitePage } from './business-invite.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BusinessInvitePageRoutingModule
  ],
  declarations: [BusinessInvitePage]
})
export class BusinessInvitePageModule {}

