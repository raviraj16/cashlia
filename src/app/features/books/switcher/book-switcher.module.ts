import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BookSwitcherComponent } from './book-switcher.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [BookSwitcherComponent],
  exports: [BookSwitcherComponent]
})
export class BookSwitcherModule {}

