import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BusinessCreateEditPage } from './business-create-edit.page';

const routes: Routes = [
  {
    path: '',
    component: BusinessCreateEditPage
  },
  {
    path: 'create',
    component: BusinessCreateEditPage
  },
  {
    path: 'edit/:id',
    component: BusinessCreateEditPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BusinessCreateEditPageRoutingModule {}

