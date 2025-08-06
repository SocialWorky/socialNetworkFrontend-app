import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

export interface SearchInputConfig {
  placeholder?: string;
  debounceTime?: number;
  minLength?: number;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  width?: string;
}

@Component({
  selector: 'worky-search-input',
  templateUrl: './search-input.component.html',
  standalone: false
})
export class SearchInputComponent implements OnInit, OnDestroy {
  @Input() config: SearchInputConfig = {
    placeholder: 'Buscar...',
    debounceTime: 300,
    minLength: 2,
    showClearButton: true,
    showSearchIcon: true,
    size: 'medium',
    width: '100%'
  };

  @Input() initialValue = '';
  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  get inputClasses(): string {
    const classes = [];
    
    // Size classes
    if (this.config.size === 'small') {
      classes.push('py-2 text-sm');
    } else if (this.config.size === 'large') {
      classes.push('py-4 text-base');
    } else {
      classes.push('py-3 text-sm'); // medium default
    }
    
    return classes.join(' ');
  }

  ngOnInit(): void {
    if (this.initialValue) {
      this.searchControl.setValue(this.initialValue);
    }

    this.searchControl.valueChanges
      .pipe(
        debounceTime(this.config.debounceTime || 300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const searchTerm = value?.trim() || '';
        if (searchTerm.length >= (this.config.minLength || 2) || searchTerm.length === 0) {
          this.search.emit(searchTerm);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClear(): void {
    this.searchControl.setValue('');
    this.clear.emit();
  }

  onFocus(): void {
    // Optional: Add focus handling logic
  }

  onBlur(): void {
    // Optional: Add blur handling logic
  }
} 