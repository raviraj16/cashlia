import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReportGeneratorPageRoutingModule } from './report-generator-routing.module';
import { ReportGeneratorPage } from './report-generator.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReportGeneratorPageRoutingModule
  ],
  declarations: [ReportGeneratorPage]
})
export class ReportGeneratorPageModule {}

