import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EntryCreateEditPage } from './entry-create-edit.page';

const routes: Routes = [
  {
    path: '',
    component: EntryCreateEditPage
  },
  {
    path: 'create',
    component: EntryCreateEditPage
  },
  {
    path: 'edit/:id',
    component: EntryCreateEditPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EntryCreateEditPageRoutingModule {}

