import { Component, OnInit } from '@angular/core';
import { EntryService, EntryFilters } from '../../../core/services/entry.service';
import { ExcelService } from '../exports/excel.service';
import { PdfService } from '../exports/pdf.service';
import { Entry } from '../../../core/models/entry.model';
import { LoadingController, ToastController } from '@ionic/angular';

export type ReportType = 'all_entries' | 'day_wise' | 'party_wise' | 'category_wise' | 'payment_mode_wise';

@Component({
  selector: 'app-report-generator',
  templateUrl: './report-generator.page.html',
  styleUrls: ['./report-generator.page.scss'],
  standalone: false,
})
export class ReportGeneratorPage implements OnInit {
  selectedReportType: ReportType = 'all_entries';
  dateFrom: string = '';
  dateTo: string = '';
  entries: Entry[] = [];
  reportData: any[] = [];

  reportTypes = [
    { value: 'all_entries', label: 'All Entries' },
    { value: 'day_wise', label: 'Day-wise Summary' },
    { value: 'party_wise', label: 'Party-wise Summary' },
    { value: 'category_wise', label: 'Category-wise Summary' },
    { value: 'payment_mode_wise', label: 'Payment Mode-wise Summary' }
  ];

  constructor(
    private entryService: EntryService,
    private excelService: ExcelService,
    private pdfService: PdfService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.dateFrom = firstDay.toISOString().split('T')[0];
    this.dateTo = today.toISOString().split('T')[0];
  }

  async generateReport() {
    const loading = await this.loadingController.create({
      message: 'Generating report...'
    });
    await loading.present();

    try {
      const filters: EntryFilters = {
        dateFilter: 'range',
        dateFrom: this.dateFrom,
        dateTo: this.dateTo
      };

      this.entries = await this.entryService.getEntries(filters);
      this.reportData = await this.processReportData();

      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Failed to generate report',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async processReportData(): Promise<any[]> {
    switch (this.selectedReportType) {
      case 'day_wise':
        return this.generateDayWiseSummary();
      case 'party_wise':
        return this.generatePartyWiseSummary();
      case 'category_wise':
        return this.generateCategoryWiseSummary();
      case 'payment_mode_wise':
        return this.generatePaymentModeWiseSummary();
      default:
        return [];
    }
  }

  private generateDayWiseSummary(): any[] {
    const summary: { [key: string]: { cashIn: number; cashOut: number } } = {};
    
    this.entries.forEach(entry => {
      const date = new Date(entry.date_time).toLocaleDateString();
      if (!summary[date]) {
        summary[date] = { cashIn: 0, cashOut: 0 };
      }
      if (entry.type === 'cash_in') {
        summary[date].cashIn += entry.amount;
      } else {
        summary[date].cashOut += entry.amount;
      }
    });

    return Object.entries(summary).map(([date, data]) => ({
      Date: date,
      'Cash In': data.cashIn,
      'Cash Out': data.cashOut,
      'Net': data.cashIn - data.cashOut
    }));
  }

  private generatePartyWiseSummary(): any[] {
    const summary: { [key: string]: { cashIn: number; cashOut: number } } = {};
    
    this.entries.forEach(entry => {
      const party = entry.party_id || 'No Party';
      if (!summary[party]) {
        summary[party] = { cashIn: 0, cashOut: 0 };
      }
      if (entry.type === 'cash_in') {
        summary[party].cashIn += entry.amount;
      } else {
        summary[party].cashOut += entry.amount;
      }
    });

    return Object.entries(summary).map(([party, data]) => ({
      Party: party,
      'Cash In': data.cashIn,
      'Cash Out': data.cashOut,
      'Net': data.cashIn - data.cashOut
    }));
  }

  private generateCategoryWiseSummary(): any[] {
    const summary: { [key: string]: { cashIn: number; cashOut: number } } = {};
    
    this.entries.forEach(entry => {
      const category = entry.category_id || 'No Category';
      if (!summary[category]) {
        summary[category] = { cashIn: 0, cashOut: 0 };
      }
      if (entry.type === 'cash_in') {
        summary[category].cashIn += entry.amount;
      } else {
        summary[category].cashOut += entry.amount;
      }
    });

    return Object.entries(summary).map(([category, data]) => ({
      Category: category,
      'Cash In': data.cashIn,
      'Cash Out': data.cashOut,
      'Net': data.cashIn - data.cashOut
    }));
  }

  private generatePaymentModeWiseSummary(): any[] {
    const summary: { [key: string]: { cashIn: number; cashOut: number } } = {};
    
    this.entries.forEach(entry => {
      if (!summary[entry.payment_mode]) {
        summary[entry.payment_mode] = { cashIn: 0, cashOut: 0 };
      }
      if (entry.type === 'cash_in') {
        summary[entry.payment_mode].cashIn += entry.amount;
      } else {
        summary[entry.payment_mode].cashOut += entry.amount;
      }
    });

    return Object.entries(summary).map(([mode, data]) => ({
      'Payment Mode': mode,
      'Cash In': data.cashIn,
      'Cash Out': data.cashOut,
      'Net': data.cashIn - data.cashOut
    }));
  }

  async exportToExcel() {
    const loading = await this.loadingController.create({
      message: 'Exporting to Excel...'
    });
    await loading.present();

    try {
      if (this.selectedReportType === 'all_entries') {
        await this.excelService.exportEntries(this.entries, this.selectedReportType);
      } else {
        await this.excelService.exportSummary(this.reportData, this.selectedReportType);
      }

      const toast = await this.toastController.create({
        message: 'Report exported successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to export report',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async exportToPdf() {
    const loading = await this.loadingController.create({
      message: 'Exporting to PDF...'
    });
    await loading.present();

    try {
      const summary = this.selectedReportType !== 'all_entries' ? this.reportData : undefined;
      await this.pdfService.exportEntries(this.entries, this.selectedReportType, summary);

      const toast = await this.toastController.create({
        message: 'Report exported successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to export report',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}

