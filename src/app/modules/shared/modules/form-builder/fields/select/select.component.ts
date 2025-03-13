// src/app/form-builder/fields/select.component.ts
import { Component, Input, OnChanges, OnInit, SimpleChanges, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { Field } from '../../interfaces/field.interface';

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor, OnChanges, OnInit {
  @Input() field!: Field;
  control = new FormControl('');

  // Implementación de ControlValueAccessor
  onChange: any = () => { };
  onTouched: any = () => { };

  ngOnInit(): void {
    if (this.field && !this.field.additionalOptions) {
      this.field.additionalOptions = {};
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field']) {
      this.field.additionalOptions = this.field.additionalOptions || {};
      this.control.setValue(this.field.value || '');
    }
  }

  writeValue(value: string): void {
    if (value !== undefined) {
      this.control.setValue(value, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
    this.control.valueChanges.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
  }

  get isVisible(): boolean {
    return this.field.additionalOptions?.visible !== false || true;
  }

  get isRequired(): boolean {
    return this.field.additionalOptions?.required === true || false;
  }
}
