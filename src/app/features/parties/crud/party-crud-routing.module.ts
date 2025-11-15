import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PartyCrudPage } from './party-crud.page';

const routes: Routes = [
  {
    path: '',
    component: PartyCrudPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartyCrudPageRoutingModule {}

