import { ChangeDetectorRef, Component, Input, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Field } from '../../interfaces/field.interface';
import { translations } from '@translations/translations';
import {
  getGeoCities,
  getGeoCountryMeta,
  getGeoCountryNames,
  getGeoRegions,
} from '../../data/geo-data';

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

  readonly countries = getGeoCountryNames();
  regions: string[] = [];
  comunas: string[] = [];

  loadingRegions = false;
  loadingCities = false;

  value: LocationValue = { country: '', region: '', comuna: '' };

  disabled = false;

  private onChange: (value: LocationValue | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.refreshOptions();
  }

  writeValue(value: LocationValue | null): void {
    this.value = {
      country: value?.country || '',
      region: value?.region || '',
      comuna: value?.comuna || '',
    };
    this.refreshOptions();
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

  async onCountryChange(country: string): Promise<void> {
    this.value = { country, region: '', comuna: '' };
    this.comunas = [];
    this.emit();
    await this.loadRegions();
  }

  async onRegionChange(region: string): Promise<void> {
    this.value = { ...this.value, region, comuna: '' };
    this.emit();
    await this.loadCities();
  }

  onComunaChange(comuna: string): void {
    this.value = { ...this.value, comuna };
    this.emit();
  }

  get isRequired(): boolean {
    return this.field?.additionalOptions?.required === true;
  }

  /** Region/city labels follow each country's terminology (Provincia, Estado, …). */
  get regionLabel(): string {
    return getGeoCountryMeta(this.value.country)?.regionLabel || translations['formBuilder.location.region'];
  }

  get cityLabel(): string {
    return getGeoCountryMeta(this.value.country)?.cityLabel || translations['formBuilder.location.comuna'];
  }

  private async refreshOptions(): Promise<void> {
    if (this.value.country) await this.loadRegions();
    if (this.value.country && this.value.region) await this.loadCities();
  }

  private async loadRegions(): Promise<void> {
    if (!this.value.country) {
      this.regions = [];
      return;
    }
    this.loadingRegions = true;
    this.cdr.markForCheck();
    this.regions = await getGeoRegions(this.value.country);
    this.loadingRegions = false;
    this.cdr.markForCheck();
  }

  private async loadCities(): Promise<void> {
    if (!this.value.country || !this.value.region) {
      this.comunas = [];
      return;
    }
    this.loadingCities = true;
    this.cdr.markForCheck();
    this.comunas = await getGeoCities(this.value.country, this.value.region);
    this.loadingCities = false;
    this.cdr.markForCheck();
  }

  private emit(): void {
    this.onTouched();
    const isEmpty = !this.value.country && !this.value.region && !this.value.comuna;
    this.onChange(isEmpty ? null : this.value);
  }
}
