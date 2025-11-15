import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BusinessService } from '../core/services/business.service';
import { BookService } from '../core/services/book.service';
import { Business } from '../core/models/business.model';
import { Book } from '../core/models/book.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentBusiness: Business | null = null;
  currentBook: Book | null = null;

  constructor(
    private router: Router,
    private businessService: BusinessService,
    private bookService: BookService
  ) {}

  async ngOnInit() {
    // Check for current business
    this.currentBusiness = await this.businessService.getCurrentBusiness();
    
    // If no business exists, redirect to business list
    if (!this.currentBusiness) {
      const businesses = await this.businessService.getBusinesses();
      if (businesses.length === 0) {
        // No businesses exist, redirect to business list
        this.router.navigate(['/business'], { replaceUrl: true });
        return;
      }
    }

    // If business exists, check for current book
    if (this.currentBusiness) {
      this.currentBook = await this.bookService.getCurrentBook();
      
      // Redirect to books list page (it will handle book selection if needed)
      this.router.navigate(['/books'], { replaceUrl: true });
    } else {
      // No current business selected, redirect to business list
      this.router.navigate(['/business'], { replaceUrl: true });
    }
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
