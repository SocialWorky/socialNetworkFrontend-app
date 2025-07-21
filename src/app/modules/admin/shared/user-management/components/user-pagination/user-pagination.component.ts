import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PaginationConfig } from '@admin/shared/components/pagination/pagination.component';

@Component({
  selector: 'worky-user-pagination',
  templateUrl: './user-pagination.component.html',
  standalone: false
})
export class UserPaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();

  get paginationConfig(): PaginationConfig {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      showInfo: true,
      showPageNumbers: true,
      maxPageNumbers: 5
    };
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }
} 