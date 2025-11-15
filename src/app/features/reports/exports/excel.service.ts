import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Entry } from '../../../core/models/entry.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  /**
   * Export entries to Excel
   */
  async exportEntries(entries: Entry[], reportType: string): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Create data array
    const data = entries.map(entry => ({
      'Date': new Date(entry.date_time).toLocaleDateString(),
      'Time': new Date(entry.date_time).toLocaleTimeString(),
      'Type': entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
      'Amount': entry.amount,
      'Payment Mode': entry.payment_mode,
      'Party': entry.party_id || '',
      'Category': entry.category_id || '',
      'Remarks': entry.remarks || ''
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 10 }, // Type
      { wch: 12 }, // Amount
      { wch: 12 }, // Payment Mode
      { wch: 15 }, // Party
      { wch: 15 }, // Category
      { wch: 30 }  // Remarks
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entries');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Save to device
    const fileName = `Cashlia_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    await this.saveFile(fileName, excelBuffer);

    // Share file
    await this.shareFile(fileName);
  }

  /**
   * Export summary report
   */
  async exportSummary(summaryData: any[], reportType: string): Promise<void> {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    
    worksheet['!cols'] = summaryData.length > 0 
      ? Object.keys(summaryData[0]).map(() => ({ wch: 15 }))
      : [];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `Cashlia_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    await this.saveFile(fileName, excelBuffer);
    await this.shareFile(fileName);
  }

  private async saveFile(fileName: string, data: ArrayBuffer): Promise<void> {
    const base64 = btoa(
      new Uint8Array(data).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents
    });
  }

  private async shareFile(fileName: string): Promise<void> {
    try {
      await Share.share({
        title: 'Share Report',
        text: 'Cashlia Report',
        url: fileName,
        dialogTitle: 'Share Report'
      });
    } catch (error) {
      console.error('Error sharing file:', error);
    }
  }
}

