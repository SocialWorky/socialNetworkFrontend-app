import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Field } from '../../interfaces/field.interface';
import { CHILE_COUNTRY, getChileComunas, getChileRegionNames } from '../../data/geo-chile.data';

export interface LocationValue {
  country: string;
  region: string;
  comuna: string;
}

@Component({
  selector: 'app-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationComponent),
      multi: true,
    },
  ],
  standalone: false,
})
export class LocationComponent implements ControlValueAccessor, OnInit {
  @Input() field!: Field;

  readonly countries = [CHILE_COUNTRY];
  regions: string[] = [];
  comunas: string[] = [];

  value: LocationValue = { country: '', region: '', comuna: '' };

  disabled = false;

  private onChange: (value: LocationValue | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.regions = getChileRegionNames();
    if (this.value.region) {
      this.comunas = getChileComunas(this.value.region);
    }
  }

  writeValue(value: LocationValue | null): void {
    this.value = {
      country: value?.country || '',
      region: value?.region || '',
      comuna: value?.comuna || '',
    };
    this.regions = getChileRegionNames();
    this.comunas = this.value.region ? getChileComunas(this.value.region) : [];
  }

  registerOnChange(fn: (value: LocationValue | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onCountryChange(country: string): void {
    this.value = { country, region: '', comuna: '' };
    this.comunas = [];
    this.emit();
  }

  onRegionChange(region: string): void {
    this.value = { ...this.value, region, comuna: '' };
    this.comunas = getChileComunas(region);
    this.emit();
  }

  onComunaChange(comuna: string): void {
    this.value = { ...this.value, comuna };
    this.emit();
  }

  get isRequired(): boolean {
    return this.field?.additionalOptions?.required === true;
  }

  private emit(): void {
    this.onTouched();
    const isEmpty = !this.value.country && !this.value.region && !this.value.comuna;
    this.onChange(isEmpty ? null : this.value);
  }
}
