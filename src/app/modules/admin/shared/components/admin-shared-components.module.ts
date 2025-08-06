import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

// Components
import { PaginationComponent } from './pagination/pagination.component';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { SearchInputComponent } from './search-input/search-input.component';
import { StatusBadgeComponent } from './status-badge/status-badge.component';
import { ActionMenuComponent } from './action-menu/action-menu.component';

@NgModule({
  declarations: [
    PaginationComponent,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    SearchInputComponent,
    StatusBadgeComponent,
    ActionMenuComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslationsModule
  ],
  exports: [
    PaginationComponent,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    SearchInputComponent,
    StatusBadgeComponent,
    ActionMenuComponent
  ]
})
export class AdminSharedComponentsModule { } 