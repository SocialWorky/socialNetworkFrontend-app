// src/app/form-builder/fields/textarea.component.ts
import { Component, Input, SimpleChanges, forwardRef, OnChanges, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { Field } from '../../interfaces/field.interface';

@Component({
    selector: 'app-textarea',
    templateUrl: './textarea.component.html',
    styleUrls: ['./textarea.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextareaComponent),
            multi: true
        }
    ],
    standalone: false
})
export class TextareaComponent implements ControlValueAccessor, OnChanges, OnInit {
  @Input() field!: Field;
  control = new FormControl('');

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

  onChange: any = () => { };
  onTouched: any = () => { };

  writeValue(value: string): void {
    this.control.setValue(value);
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

  get isRequired(): boolean {
    return this.field.additionalOptions?.required === true || false;
  }

  get isVisible(): boolean {
    return this.field.additionalOptions?.visible !== false || true;
  }
}
