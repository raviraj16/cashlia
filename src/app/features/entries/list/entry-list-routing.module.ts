import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EntryListPage } from './entry-list.page';

const routes: Routes = [
  {
    path: '',
    component: EntryListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EntryListPageRoutingModule {}

