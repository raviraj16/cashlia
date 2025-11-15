import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSkeletonComponent } from './loading-skeleton.component';

@NgModule({
  declarations: [LoadingSkeletonComponent],
  imports: [CommonModule],
  exports: [LoadingSkeletonComponent]
})
export class LoadingSkeletonModule {}

