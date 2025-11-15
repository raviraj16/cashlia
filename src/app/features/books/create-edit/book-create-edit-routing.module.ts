import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BookCreateEditPage } from './book-create-edit.page';

const routes: Routes = [
  {
    path: '',
    component: BookCreateEditPage
  },
  {
    path: 'create',
    component: BookCreateEditPage
  },
  {
    path: 'edit/:id',
    component: BookCreateEditPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BookCreateEditPageRoutingModule {}

