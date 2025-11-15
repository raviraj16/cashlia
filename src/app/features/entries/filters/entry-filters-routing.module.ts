import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EntryFiltersPage } from './entry-filters.page';

const routes: Routes = [
  {
    path: '',
    component: EntryFiltersPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EntryFiltersPageRoutingModule {}

