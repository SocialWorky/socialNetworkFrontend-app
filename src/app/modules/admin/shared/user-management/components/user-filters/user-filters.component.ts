import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserRole, UserStatus, UserFilters } from '@admin/interfaces/user-management.interface';

@Component({
  selector: 'worky-user-filters',
  templateUrl: './user-filters.component.html',
  styleUrls: ['./user-filters.component.scss'],
  standalone: false
})
export class UserFiltersComponent {
  @Input() showFilters = false;
  @Output() filtersApplied = new EventEmitter<UserFilters>();
  @Output() filtersCleared = new EventEmitter<void>();

  filtersForm: FormGroup;
  UserRole = UserRole;
  UserStatus = UserStatus;

  constructor(private fb: FormBuilder) {
    this.filtersForm = this.fb.group({
      search: [''],
      role: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  applyFilters(): void {
    this.filtersApplied.emit(this.filtersForm.value);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.filtersCleared.emit();
  }
} 