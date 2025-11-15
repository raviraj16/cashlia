import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppLockPage } from './app-lock.page';

const routes: Routes = [
  {
    path: '',
    component: AppLockPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppLockPageRoutingModule {}

