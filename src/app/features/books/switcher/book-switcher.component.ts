import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../core/models/book.model';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-book-switcher',
  templateUrl: './book-switcher.component.html',
  styleUrls: ['./book-switcher.component.scss'],
  standalone: false,
})
export class BookSwitcherComponent implements OnInit {
  @Input() currentBook: Book | null = null;
  @Output() bookSelected = new EventEmitter<Book>();

  books: Book[] = [];

  constructor(
    private bookService: BookService,
    private popoverController: PopoverController
  ) {}

  async ngOnInit() {
    await this.loadBooks();
  }

  async loadBooks() {
    try {
      this.books = await this.bookService.getBooks();
      if (!this.currentBook && this.books.length > 0) {
        this.currentBook = this.books[0];
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }

  async selectBook(book: Book) {
    await this.bookService.setCurrentBook(book.id);
    this.currentBook = book;
    this.bookSelected.emit(book);
    await this.popoverController.dismiss();
  }
}

