/**
 * Geo provider for the `location` custom field: Country -> Region -> City.
 *
 * Hybrid source:
 *  - Chile keeps the curated, commune-level dataset (geo-chile.data.ts).
 *  - The other countries use the ISO `country-state-city` dataset (all states and
 *    cities), loaded lazily so Chile-only usage never pulls the large dataset.
 *
 * `regionLabel` / `cityLabel` keep each country's own terminology
 * (Provincia, Estado, Departamento, Comunidad / Comuna, Ciudad).
 */

import { CHILE_REGIONS } from './geo-chile.data';

export interface GeoCountryMeta {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  regionLabel: string;
  cityLabel: string;
}

export const GEO_COUNTRIES: GeoCountryMeta[] = [
  { name: 'Chile', code: 'CL', regionLabel: 'Región', cityLabel: 'Comuna' },
  { name: 'Argentina', code: 'AR', regionLabel: 'Provincia', cityLabel: 'Ciudad' },
  { name: 'Bolivia', code: 'BO', regionLabel: 'Departamento', cityLabel: 'Ciudad' },
  { name: 'Brasil', code: 'BR', regionLabel: 'Estado', cityLabel: 'Ciudad' },
  { name: 'Colombia', code: 'CO', regionLabel: 'Departamento', cityLabel: 'Ciudad' },
  { name: 'Ecuador', code: 'EC', regionLabel: 'Provincia', cityLabel: 'Ciudad' },
  { name: 'España', code: 'ES', regionLabel: 'Comunidad / Provincia', cityLabel: 'Ciudad' },
  { name: 'Estados Unidos', code: 'US', regionLabel: 'Estado', cityLabel: 'Ciudad' },
  { name: 'México', code: 'MX', regionLabel: 'Estado', cityLabel: 'Ciudad' },
  { name: 'Paraguay', code: 'PY', regionLabel: 'Departamento', cityLabel: 'Ciudad' },
  { name: 'Perú', code: 'PE', regionLabel: 'Departamento', cityLabel: 'Ciudad' },
  { name: 'Uruguay', code: 'UY', regionLabel: 'Departamento', cityLabel: 'Ciudad' },
  { name: 'Venezuela', code: 'VE', regionLabel: 'Estado', cityLabel: 'Ciudad' },
];

const CHILE_CODE = 'CL';

export function getGeoCountryNames(): string[] {
  return GEO_COUNTRIES.map((c) => c.name);
}

export function getGeoCountryMeta(countryName: string): GeoCountryMeta | undefined {
  return GEO_COUNTRIES.find((c) => c.name === countryName);
}

// Lazy single-load of the large ISO dataset — only fetched when a non-Chile
// country is used. Cached so the import resolves once per session.
let cscModule: Promise<typeof import('country-state-city')> | null = null;
function loadCsc(): Promise<typeof import('country-state-city')> {
  if (!cscModule) {
    cscModule = import('country-state-city');
  }
  return cscModule;
}

export async function getGeoRegions(countryName: string): Promise<string[]> {
  const meta = getGeoCountryMeta(countryName);
  if (!meta) return [];

  if (meta.code === CHILE_CODE) {
    return CHILE_REGIONS.map((r) => r.name);
  }

  const { State } = await loadCsc();
  return State.getStatesOfCountry(meta.code)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function getGeoCities(
  countryName: string,
  regionName: string,
): Promise<string[]> {
  const meta = getGeoCountryMeta(countryName);
  if (!meta || !regionName) return [];

  if (meta.code === CHILE_CODE) {
    return CHILE_REGIONS.find((r) => r.name === regionName)?.comunas ?? [];
  }

  const { State, City } = await loadCsc();
  const state = State.getStatesOfCountry(meta.code).find((s) => s.name === regionName);
  if (!state) return [];

  return City.getCitiesOfState(meta.code, state.isoCode)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}
