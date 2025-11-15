import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { EntryService, EntrySummary, EntryFilters } from '../../../core/services/entry.service';
import { BookService } from '../../../core/services/book.service';
import { PartyService } from '../../../core/services/party.service';
import { CategoryService } from '../../../core/services/category.service';
import { Entry } from '../../../core/models/entry.model';
import { Book } from '../../../core/models/book.model';
import { Party } from '../../../core/models/party.model';
import { Category } from '../../../core/models/category.model';
import { LoadingController, ToastController, RefresherCustomEvent } from '@ionic/angular';

interface GroupedEntries {
  date: string;
  displayDate: string;
  entries: Entry[];
}

@Component({
  selector: 'app-entry-list',
  templateUrl: './entry-list.page.html',
  styleUrls: ['./entry-list.page.scss'],
  standalone: false,
})
export class EntryListPage implements OnInit {
  entries: Entry[] = [];
  groupedEntries: GroupedEntries[] = [];
  summary: EntrySummary = {
    netBalance: 0,
    totalCashIn: 0,
    totalCashOut: 0
  };
  filtersApplied = false;
  currentBook: Book | null = null;
  parties: Party[] = [];
  categories: Category[] = [];
  partyMap: Map<string, string> = new Map();
  categoryMap: Map<string, string> = new Map();

  constructor(
    private entryService: EntryService,
    private bookService: BookService,
    private partyService: PartyService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Check for filters in query params
    const filtersParam = this.route.snapshot.queryParamMap.get('filters');
    let filters: EntryFilters | undefined;
    
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
        this.filtersApplied = true;
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    }

    await this.loadPartiesAndCategories();
    await this.loadEntries(filters);
    this.currentBook = await this.bookService.getCurrentBook();
  }

  /**
   * Called every time the page is about to enter
   * This ensures the list refreshes when navigating back from create/edit
   */
  async ionViewWillEnter() {
    // Refresh parties and categories in case they were updated
    await this.loadPartiesAndCategories();
    
    // Check for filters in query params (in case they changed)
    const filtersParam = this.route.snapshot.queryParamMap.get('filters');
    let filters: EntryFilters | undefined;
    
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
        this.filtersApplied = true;
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    }
    
    // Refresh entries list without showing loading (silent refresh)
    await this.loadEntries(filters, false);
    
    // Refresh current book
    this.currentBook = await this.bookService.getCurrentBook();
  }

  async loadPartiesAndCategories() {
    try {
      this.parties = await this.partyService.getParties();
      this.categories = await this.categoryService.getCategories();
      
      // Create maps for quick lookup
      this.partyMap.clear();
      this.parties.forEach(party => {
        this.partyMap.set(party.id, party.name);
      });
      
      this.categoryMap.clear();
      this.categories.forEach(category => {
        this.categoryMap.set(category.id, category.name);
      });
    } catch (error) {
      console.error('Error loading parties and categories:', error);
    }
  }

  async loadEntries(filters?: EntryFilters, showLoading: boolean = true) {
    const loading = showLoading ? await this.loadingController.create({
      message: 'Loading entries...'
    }) : null;
    
    if (loading) {
      await loading.present();
    }

    try {
      this.entries = await this.entryService.getEntries(filters);
      this.summary = await this.entryService.getEntrySummary(filters);
      this.currentBook = await this.bookService.getCurrentBook();
      this.groupEntriesByDate();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load entries',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  async createEntry() {
    this.router.navigate(['/entries/create']);
  }

  viewEntry(entry: Entry) {
    this.router.navigate(['/entries/detail', entry.id]);
  }

  async openFilters() {
    this.router.navigate(['/entries/filters'], {
      queryParams: { returnUrl: '/entries/list' }
    });
  }

  async viewReport() {
    this.router.navigate(['/reports/generator']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (entryDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (entryDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPartyName(partyId?: string): string {
    if (!partyId) return '';
    return this.partyMap.get(partyId) || '';
  }

  getCategoryName(categoryId?: string): string {
    if (!categoryId) return '';
    return this.categoryMap.get(categoryId) || '';
  }

  /**
   * Group entries by date
   */
  groupEntriesByDate(): void {
    const grouped = new Map<string, Entry[]>();
    
    // Group entries by date (YYYY-MM-DD)
    this.entries.forEach(entry => {
      const entryDate = new Date(entry.date_time);
      const dateKey = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(entry);
    });

    // Convert to array and sort by date (newest first)
    this.groupedEntries = Array.from(grouped.entries())
      .map(([dateKey, entries]) => {
        const date = new Date(dateKey);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let displayDate: string;
        if (entryDate.getTime() === today.getTime()) {
          displayDate = 'Today';
        } else if (entryDate.getTime() === yesterday.getTime()) {
          displayDate = 'Yesterday';
        } else {
          displayDate = date.toLocaleDateString('en-IN', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }

        // Sort entries within the date group by time (newest first)
        entries.sort((a, b) => {
          return new Date(b.date_time).getTime() - new Date(a.date_time).getTime();
        });

        return {
          date: dateKey,
          displayDate,
          entries
        };
      })
      .sort((a, b) => {
        // Sort groups by date (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }

  async doRefresh(event: Event) {
    const ev = event as RefresherCustomEvent;
    await this.loadPartiesAndCategories();
    await this.loadEntries();
    ev.target.complete();
  }
}

