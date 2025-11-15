import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { EntryService, EntryFilters } from '../../../core/services/entry.service';
import { PartyService } from '../../../core/services/party.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { DatabaseService } from '../../../core/services/database.service';
import { EntryType, PaymentMode } from '../../../core/models/entry.model';
import { Party } from '../../../core/models/party.model';
import { Category } from '../../../core/models/category.model';
import { User } from '../../../core/models/user.model';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-entry-filters',
  templateUrl: './entry-filters.page.html',
  styleUrls: ['./entry-filters.page.scss'],
  standalone: false,
})
export class EntryFiltersPage implements OnInit {
  filters: EntryFilters = {};
  parties: Party[] = [];
  categories: Category[] = [];
  members: User[] = [];

  dateFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'range', label: 'Custom Range' }
  ];

  entryTypes: EntryType[] = ['cash_in', 'cash_out'];
  paymentModes: PaymentMode[] = ['cash', 'online', 'credit_card'];

  selectedEntryTypes: EntryType[] = [];
  selectedPaymentModes: PaymentMode[] = [];
  selectedParties: string[] = [];
  selectedCategories: string[] = [];
  selectedMembers: string[] = [];

  showDateRange = false;

  constructor(
    private entryService: EntryService,
    private partyService: PartyService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private businessService: BusinessService,
    private databaseService: DatabaseService,
    private modalController: ModalController,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    await this.loadParties();
    await this.loadCategories();
    await this.loadMembers();
  }

  async loadParties() {
    try {
      this.parties = await this.partyService.getParties();
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  }

  async loadCategories() {
    try {
      this.categories = await this.categoryService.getCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadMembers() {
    try {
      const currentBusiness = await this.businessService.getCurrentBusiness();
      if (currentBusiness) {
        const teamMembers = await this.businessService.getTeamMembers(currentBusiness.id);
        // Get user details for each team member
        const memberPromises = teamMembers.map(async (member) => {
          const users = await this.databaseService.query('SELECT * FROM users WHERE id = ?', [member.user_id]);
          return users.length > 0 ? users[0] : null;
        });
        const memberUsers = await Promise.all(memberPromises);
        this.members = memberUsers.filter(m => m !== null) as User[];
      } else {
        // Fallback to current user if no business selected
        const user = await this.authService.getCurrentUser();
        if (user) {
          this.members = [user];
        }
      }
    } catch (error) {
      console.error('Error loading members:', error);
      // Fallback to current user
      const user = await this.authService.getCurrentUser();
      if (user) {
        this.members = [user];
      }
    }
  }

  onDateFilterChange(event: any) {
    const value = event.detail.value;
    this.filters.dateFilter = value;
    this.showDateRange = value === 'range';
    
    if (value !== 'range') {
      this.filters.dateFrom = undefined;
      this.filters.dateTo = undefined;
    }
  }

  onEntryTypeChange(event: any) {
    this.selectedEntryTypes = event.detail.value;
    this.filters.entryType = this.selectedEntryTypes.length > 0 ? this.selectedEntryTypes : undefined;
  }

  onPaymentModeChange(event: any) {
    this.selectedPaymentModes = event.detail.value;
    this.filters.paymentModes = this.selectedPaymentModes.length > 0 ? this.selectedPaymentModes : undefined;
  }

  onPartyChange(event: any) {
    this.selectedParties = event.detail.value;
    this.filters.parties = this.selectedParties.length > 0 ? this.selectedParties : undefined;
  }

  onCategoryChange(event: any) {
    this.selectedCategories = event.detail.value;
    this.filters.categories = this.selectedCategories.length > 0 ? this.selectedCategories : undefined;
  }

  onMemberChange(event: any) {
    this.selectedMembers = event.detail.value;
    this.filters.members = this.selectedMembers.length > 0 ? this.selectedMembers : undefined;
  }

  async applyFilters() {
    // Navigate back with filters
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/entries/list';
    this.router.navigate([returnUrl], {
      queryParams: { filters: JSON.stringify(this.filters) }
    });
  }

  async clearFilters() {
    this.filters = {};
    this.selectedEntryTypes = [];
    this.selectedPaymentModes = [];
    this.selectedParties = [];
    this.selectedCategories = [];
    this.selectedMembers = [];
    this.showDateRange = false;
    // Navigate back without filters
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/entries/list';
    this.router.navigate([returnUrl]);
  }

  async cancel() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/entries/list';
    this.router.navigate([returnUrl]);
  }
}

