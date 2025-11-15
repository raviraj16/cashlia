import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../core/models/book.model';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-book-create-edit',
  templateUrl: './book-create-edit.page.html',
  styleUrls: ['./book-create-edit.page.scss'],
  standalone: false,
})
export class BookCreateEditPage implements OnInit {
  bookForm: FormGroup;
  bookId: string | null = null;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private bookService: BookService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.bookForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  async ngOnInit() {
    this.bookId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.bookId;

    if (this.isEditMode && this.bookId) {
      await this.loadBook();
    }
  }

  async loadBook() {
    if (!this.bookId) return;

    const loading = await this.loadingController.create({
      message: 'Loading book...'
    });
    await loading.present();

    try {
      const book = await this.bookService.getBookById(this.bookId);
      if (book) {
        this.bookForm.patchValue({
          name: book.name
        });
      }
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to load book',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async save() {
    if (this.bookForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditMode ? 'Updating book...' : 'Creating book...'
    });
    await loading.present();

    try {
      if (this.isEditMode && this.bookId) {
        await this.bookService.updateBook(this.bookId, {
          name: this.bookForm.value.name
        });
        
        const toast = await this.toastController.create({
          message: 'Book updated successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      } else {
        const book = await this.bookService.createBook(this.bookForm.value.name);
        
        const toast = await this.toastController.create({
          message: 'Book created successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }

      this.router.navigate(['/books']);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Failed to save book',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}

