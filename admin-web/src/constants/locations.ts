/**
 * State/province codes and countries for admin forms.
 * State selection is country-specific; use getStatesForCountry(countryCode).
 */

export type StateOption = { code: string; name: string };

export const US_STATES: StateOption[] = [
  { code: '', name: '— Select state —' },
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

/** Canadian provinces and territories (ISO 3166-2:CA / Canada Post) */
export const CAN_PROVINCES: StateOption[] = [
  { code: '', name: '— Select province/territory —' },
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

/** Mexican states (32 federal entities) */
export const MEX_STATES: StateOption[] = [
  { code: '', name: '— Select state —' },
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'CMX', name: 'Mexico City' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'MEX', name: 'México' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
];

/** UK constituent countries / regions */
export const UK_REGIONS: StateOption[] = [
  { code: '', name: '— Select region —' },
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
];

/** Australian states and territories */
export const AUS_STATES: StateOption[] = [
  { code: '', name: '— Select state/territory —' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'WA', name: 'Western Australia' },
];

/** States/provinces by country code. Empty or missing = use free-text state field. */
export const STATES_BY_COUNTRY: Record<string, StateOption[]> = {
  USA: US_STATES,
  CAN: CAN_PROVINCES,
  MEX: MEX_STATES,
  GBR: UK_REGIONS,
  AUS: AUS_STATES,
};

/**
 * Returns state/province options for the given country code (with empty "Select…" first).
 * Returns null if the country has no predefined list (use text input for state).
 */
export function getStatesForCountry(countryCode: string): StateOption[] | null {
  if (!countryCode || countryCode === 'Other') return null;
  const list = STATES_BY_COUNTRY[countryCode];
  return list ?? null;
}

export const COUNTRIES: { code: string; name: string }[] = [
  { code: '', name: '— Select country —' },
  { code: 'USA', name: 'United States' },
  { code: 'CAN', name: 'Canada' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'IRL', name: 'Ireland' },
  { code: 'AUS', name: 'Australia' },
  { code: 'NZL', name: 'New Zealand' },
  { code: 'JPN', name: 'Japan' },
  { code: 'KOR', name: 'South Korea' },
  { code: 'CHN', name: 'China' },
  { code: 'IND', name: 'India' },
  { code: 'DEU', name: 'Germany' },
  { code: 'FRA', name: 'France' },
  { code: 'ESP', name: 'Spain' },
  { code: 'ITA', name: 'Italy' },
  { code: 'NLD', name: 'Netherlands' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'SWE', name: 'Sweden' },
  { code: 'NOR', name: 'Norway' },
  { code: 'DNK', name: 'Denmark' },
  { code: 'FIN', name: 'Finland' },
  { code: 'CHE', name: 'Switzerland' },
  { code: 'AUT', name: 'Austria' },
  { code: 'PRT', name: 'Portugal' },
  { code: 'ZAF', name: 'South Africa' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'CHL', name: 'Chile' },
  { code: 'COL', name: 'Colombia' },
  { code: 'THA', name: 'Thailand' },
  { code: 'SGP', name: 'Singapore' },
  { code: 'MYS', name: 'Malaysia' },
  { code: 'PHL', name: 'Philippines' },
  { code: 'IDN', name: 'Indonesia' },
  { code: 'ARE', name: 'United Arab Emirates' },
  { code: 'SAU', name: 'Saudi Arabia' },
  { code: 'Other', name: 'Other' },
];
