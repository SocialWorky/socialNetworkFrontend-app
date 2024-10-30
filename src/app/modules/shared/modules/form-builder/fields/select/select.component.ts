// src/app/form-builder/fields/select.component.ts
import { Component, Input, OnChanges, SimpleChanges, forwardRef } from '@angular/core';
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
export class SelectComponent implements ControlValueAccessor, OnChanges {
  @Input() field!: Field;
  control = new FormControl('');

  // Implementación de ControlValueAccessor
  onChange: any = () => { };
  onTouched: any = () => { };


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field']) {
      this.control.setValue(this.field.value || '');
    }
  }

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

  // Método para comprobar visibilidad
  get isVisible(): boolean {
    return this.field.visible !== false; // Muestra si visible no es false
  }

  // Método para comprobar si es requerido
  get isRequired(): boolean {
    return this.field.required === true; // Devuelve true si requerido
  }
}
