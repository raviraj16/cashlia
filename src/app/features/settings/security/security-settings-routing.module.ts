import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SecuritySettingsPage } from './security-settings.page';

const routes: Routes = [
  {
    path: '',
    component: SecuritySettingsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SecuritySettingsPageRoutingModule {}

