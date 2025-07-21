import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  showInfo?: boolean;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
}

@Component({
  selector: 'worky-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: false
})
export class PaginationComponent {
  @Input() config: PaginationConfig = {
    currentPage: 1,
    totalPages: 0,
    showInfo: true,
    showPageNumbers: true,
    maxPageNumbers: 5
  };
  
  @Output() pageChange = new EventEmitter<number>();

  get visiblePageNumbers(): number[] {
    if (!this.config.showPageNumbers || this.config.totalPages <= 1) {
      return [];
    }

    const maxPages = this.config.maxPageNumbers || 5;
    const current = this.config.currentPage;
    const total = this.config.totalPages;

    if (total <= maxPages) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const half = Math.floor(maxPages / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + maxPages - 1);

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get paginationInfo(): string {
    if (!this.config.showInfo) return '';
    
    if (this.config.totalItems && this.config.itemsPerPage) {
      const start = (this.config.currentPage - 1) * this.config.itemsPerPage + 1;
      const end = Math.min(this.config.currentPage * this.config.itemsPerPage, this.config.totalItems);
      return `Mostrando ${start}-${end} de ${this.config.totalItems} elementos`;
    }
    
    return `Página ${this.config.currentPage} de ${this.config.totalPages}`;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.config.totalPages && page !== this.config.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onFirstPage(): void {
    this.onPageChange(1);
  }

  onLastPage(): void {
    this.onPageChange(this.config.totalPages);
  }

  onPreviousPage(): void {
    this.onPageChange(this.config.currentPage - 1);
  }

  onNextPage(): void {
    this.onPageChange(this.config.currentPage + 1);
  }
} 