import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SyncSettingsPage } from './sync-settings.page';

const routes: Routes = [
  {
    path: '',
    component: SyncSettingsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncSettingsPageRoutingModule {}

