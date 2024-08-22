export interface StreetMapData {
    results:       Result[];
    status:        Status;
    total_results: number;
}

export interface Result {
    annotations: Annotations;
    components:  Components;
    formatted:   string;
    geometry:    Geometry;
}

export interface Annotations {
    OSM:         Osm;
    callingcode: number;
    currency:    Currency;
    flag:        string;
    timezone:    Timezone;
}

export interface Osm {
    url: string;
}

export interface Currency {
    alternate_symbols:     any[];
    decimal_mark:          string;
    disambiguate_symbol:   string;
    html_entity:           string;
    iso_code:              string;
    iso_numeric:           string;
    name:                  string;
    smallest_denomination: number;
    subunit:               string;
    subunit_to_unit:       number;
    symbol:                string;
    symbol_first:          number;
    thousands_separator:   string;
}

export interface Timezone {
    name:          string;
    now_in_dst:    number;
    offset_sec:    number;
    offset_string: string;
    short_name:    number;
}

export interface Components {
    _normalized_city: string;
    _type:            string;
    building:         string;
    city:             string;
    continent:        string;
    country:          string;
    country_code:     string;
    county:           string;
    house_number:     string;
    postcode:         string;
    residential:      string;
    road:             string;
    state:            string;
    state_code:       string;
    suburb:           string;
}

export interface Status {
    code:    number;
    message: string;
}

export interface Geometry {
    lat: number;
    lng: number;
}
