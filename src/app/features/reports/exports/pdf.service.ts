import { Injectable } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Entry } from '../../../core/models/entry.model';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  /**
   * Export entries to PDF
   */
  async exportEntries(entries: Entry[], reportType: string, summary?: any): Promise<void> {
    // Using pdfmake - create document definition
    const docDefinition: any = {
      content: [
        { text: 'Cashlia Report', style: 'header' },
        { text: reportType, style: 'subheader' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: 'date' },
        { text: '\n' },
        this.createEntriesTable(entries),
        { text: '\n' },
        summary ? this.createSummarySection(summary) : null
      ].filter(Boolean),
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        date: {
          fontSize: 10,
          italics: true,
          margin: [0, 0, 0, 10]
        }
      }
    };

    // Note: pdfmake requires browser environment or server-side rendering
    // For mobile, we'll use a simplified approach or convert to base64
    const pdfBlob = await this.generatePdfBlob(docDefinition);
    const fileName = `Cashlia_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    await this.saveFile(fileName, pdfBlob);
    await this.shareFile(fileName);
  }

  private createEntriesTable(entries: Entry[]): any {
    return {
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*', '*'],
        body: [
          ['Date', 'Type', 'Amount', 'Payment Mode', 'Remarks'],
          ...entries.map(entry => [
            new Date(entry.date_time).toLocaleDateString(),
            entry.type === 'cash_in' ? 'Cash In' : 'Cash Out',
            entry.amount.toString(),
            entry.payment_mode,
            entry.remarks || ''
          ])
        ]
      }
    };
  }

  private createSummarySection(summary: any): any {
    return {
      text: 'Summary',
      style: 'subheader'
    };
  }

  private async generatePdfBlob(docDefinition: any): Promise<Blob> {
    // Simplified PDF generation
    // In production, use pdfmake or jsPDF properly
    const text = JSON.stringify(docDefinition);
    return new Blob([text], { type: 'application/pdf' });
  }

  private async saveFile(fileName: string, blob: Blob): Promise<void> {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents
      });
    };
    reader.readAsDataURL(blob);
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

