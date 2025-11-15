import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from '../../../core/services/book.service';
import { BusinessService } from '../../../core/services/business.service';
import { Book } from '../../../core/models/book.model';
import { Business } from '../../../core/models/business.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.page.html',
  styleUrls: ['./book-list.page.scss'],
  standalone: false,
})
export class BookListPage implements OnInit {
  books: Book[] = [];
  currentBook: Book | null = null;
  currentBusiness: Business | null = null;

  constructor(
    private bookService: BookService,
    private businessService: BusinessService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadBooks();
    this.currentBook = await this.bookService.getCurrentBook();
    this.currentBusiness = await this.businessService.getCurrentBusiness();
  }

  /**
   * Called every time the page is about to enter
   * This ensures the list refreshes when navigating back from create/edit
   */
  async ionViewWillEnter() {
    // Refresh books list without showing loading (silent refresh)
    await this.loadBooks(false);
    this.currentBook = await this.bookService.getCurrentBook();
    this.currentBusiness = await this.businessService.getCurrentBusiness();
  }

  async loadBooks(showLoading: boolean = true) {
    const loading = showLoading ? await this.loadingController.create({
      message: 'Loading books...'
    }) : null;
    
    if (loading) {
      await loading.present();
    }

    try {
      this.books = await this.bookService.getBooks();
      this.currentBook = await this.bookService.getCurrentBook();
      this.currentBusiness = await this.businessService.getCurrentBusiness();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load books',
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

  async selectBook(book: Book) {
    await this.bookService.setCurrentBook(book.id);
    this.currentBook = book;
    
    const toast = await this.toastController.create({
      message: `Switched to ${book.name}`,
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    this.router.navigate(['/entries/list']);
  }

  async createBook() {
    this.router.navigate(['/books/create']);
  }

  async editBook(book: Book, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/books/edit', book.id]);
  }

  async cloneBook(book: Book, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Clone Book',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'New book name',
          value: `${book.name} (Copy)`
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clone',
          handler: async (data) => {
            if (!data.name || !data.name.trim()) {
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Cloning book...'
            });
            await loading.present();

            try {
              await this.bookService.cloneBook(book.id, data.name.trim());
              await this.loadBooks();
              
              const toast = await this.toastController.create({
                message: 'Book cloned successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to clone book',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteBook(book: Book, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Delete Book',
      message: `Are you sure you want to delete "${book.name}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting book...'
            });
            await loading.present();

            try {
              await this.bookService.deleteBook(book.id);
              await this.loadBooks();
              
              const toast = await this.toastController.create({
                message: 'Book deleted successfully',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error.message || 'Failed to delete book',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  isCurrentBook(book: Book): boolean {
    return this.currentBook?.id === book.id;
  }
}

