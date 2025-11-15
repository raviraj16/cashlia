import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ReportGeneratorPage } from './report-generator.page';

const routes: Routes = [
  {
    path: '',
    component: ReportGeneratorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportGeneratorPageRoutingModule {}

