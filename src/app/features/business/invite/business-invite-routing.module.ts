import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BusinessInvitePage } from './business-invite.page';

const routes: Routes = [
  {
    path: '',
    component: BusinessInvitePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BusinessInvitePageRoutingModule {}

