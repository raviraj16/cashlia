import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeamManagementPage } from './team-management.page';

const routes: Routes = [
  {
    path: '',
    component: TeamManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeamManagementPageRoutingModule {}

