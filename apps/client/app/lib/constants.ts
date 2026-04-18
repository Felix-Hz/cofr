export const SUPPORTED_CURRENCIES = [
  "NZD",
  "EUR",
  "USD",
  "GBP",
  "AUD",
  "BRL",
  "ARS",
  "COP",
  "JPY",
] as const;

/** Maps IANA timezone to currency. Timezone reflects actual location,
 *  unlike navigator.language which reflects UI language preference. */
const TIMEZONE_CURRENCY_MAP: Record<string, string> = {
  // New Zealand
  "Pacific/Auckland": "NZD",
  "Pacific/Chatham": "NZD",

  // United States
  "America/New_York": "USD",
  "America/Chicago": "USD",
  "America/Denver": "USD",
  "America/Los_Angeles": "USD",
  "America/Anchorage": "USD",
  "America/Adak": "USD",
  "America/Phoenix": "USD",
  "America/Boise": "USD",
  "America/Indiana/Indianapolis": "USD",
  "America/Indiana/Knox": "USD",
  "America/Indiana/Marengo": "USD",
  "America/Indiana/Petersburg": "USD",
  "America/Indiana/Tell_City": "USD",
  "America/Indiana/Vevay": "USD",
  "America/Indiana/Vincennes": "USD",
  "America/Indiana/Winamac": "USD",
  "America/Kentucky/Louisville": "USD",
  "America/Kentucky/Monticello": "USD",
  "America/Menominee": "USD",
  "America/Nome": "USD",
  "America/North_Dakota/Beulah": "USD",
  "America/North_Dakota/Center": "USD",
  "America/North_Dakota/New_Salem": "USD",
  "America/Sitka": "USD",
  "America/Yakutat": "USD",
  "America/Juneau": "USD",
  "America/Detroit": "USD",
  "Pacific/Honolulu": "USD",

  // Europe - GBP
  "Europe/London": "GBP",
  "Europe/Belfast": "GBP",
  "Europe/Jersey": "GBP",
  "Europe/Guernsey": "GBP",
  "Europe/Isle_of_Man": "GBP",

  // Europe - EUR
  "Europe/Berlin": "EUR",
  "Europe/Paris": "EUR",
  "Europe/Rome": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Amsterdam": "EUR",
  "Europe/Brussels": "EUR",
  "Europe/Vienna": "EUR",
  "Europe/Dublin": "EUR",
  "Europe/Helsinki": "EUR",
  "Europe/Lisbon": "EUR",
  "Europe/Athens": "EUR",
  "Europe/Luxembourg": "EUR",
  "Europe/Malta": "EUR",
  "Europe/Monaco": "EUR",
  "Europe/Tallinn": "EUR",
  "Europe/Riga": "EUR",
  "Europe/Vilnius": "EUR",
  "Europe/Bratislava": "EUR",
  "Europe/Ljubljana": "EUR",
  "Europe/Nicosia": "EUR",
  "Atlantic/Canary": "EUR",
  "Atlantic/Madeira": "EUR",
  "Atlantic/Azores": "EUR",
  "Europe/Andorra": "EUR",
  "Europe/San_Marino": "EUR",
  "Europe/Vatican": "EUR",
  "Europe/Busingen": "EUR",
  "Europe/Tirane": "EUR",
  "Europe/Podgorica": "EUR",
  "Europe/Skopje": "EUR",
  "Europe/Zagreb": "EUR",

  // Australia
  "Australia/Sydney": "AUD",
  "Australia/Melbourne": "AUD",
  "Australia/Brisbane": "AUD",
  "Australia/Perth": "AUD",
  "Australia/Adelaide": "AUD",
  "Australia/Hobart": "AUD",
  "Australia/Darwin": "AUD",
  "Australia/Canberra": "AUD",
  "Australia/Lord_Howe": "AUD",
  "Australia/Broken_Hill": "AUD",
  "Australia/Currie": "AUD",
  "Australia/Eucla": "AUD",
  "Australia/Lindeman": "AUD",
  "Antarctica/Macquarie": "AUD",

  // Brazil
  "America/Sao_Paulo": "BRL",
  "America/Fortaleza": "BRL",
  "America/Manaus": "BRL",
  "America/Recife": "BRL",
  "America/Belem": "BRL",
  "America/Bahia": "BRL",
  "America/Cuiaba": "BRL",
  "America/Campo_Grande": "BRL",
  "America/Porto_Velho": "BRL",
  "America/Boa_Vista": "BRL",
  "America/Rio_Branco": "BRL",
  "America/Araguaina": "BRL",
  "America/Maceio": "BRL",
  "America/Santarem": "BRL",
  "America/Noronha": "BRL",
  "America/Eirunepe": "BRL",

  // Argentina
  "America/Argentina/Buenos_Aires": "ARS",
  "America/Argentina/Cordoba": "ARS",
  "America/Argentina/Mendoza": "ARS",
  "America/Argentina/Salta": "ARS",
  "America/Argentina/Jujuy": "ARS",
  "America/Argentina/Tucuman": "ARS",
  "America/Argentina/Catamarca": "ARS",
  "America/Argentina/La_Rioja": "ARS",
  "America/Argentina/San_Juan": "ARS",
  "America/Argentina/San_Luis": "ARS",
  "America/Argentina/Rio_Gallegos": "ARS",
  "America/Argentina/Ushuaia": "ARS",

  // Colombia
  "America/Bogota": "COP",

  // Japan
  "Asia/Tokyo": "JPY",

  // Pacific - USD territories
  "Pacific/Guam": "USD",
  "Pacific/Pago_Pago": "USD",
  "Pacific/Wake": "USD",
  "Pacific/Midway": "USD",
  "Pacific/Johnston": "USD",
  "Pacific/Palau": "USD",

  // Pacific - NZD territories
  "Pacific/Fiji": "NZD",
  "Pacific/Tongatapu": "NZD",
  "Pacific/Apia": "NZD",
  "Pacific/Fakaofo": "NZD",

  // Pacific - AUD territories
  "Pacific/Norfolk": "AUD",

  // Americas - USD-pegged or USD-using
  "America/Panama": "USD",
  "America/Puerto_Rico": "USD",
  "America/Virgin": "USD",
  "Pacific/Majuro": "USD",
  "Pacific/Kwajalein": "USD",
  "Pacific/Ponape": "USD",
  "Pacific/Kosrae": "USD",
  "Pacific/Truk": "USD",

  // Canada (CAD not in supported list, skip)
  // Mexico (MXN not in supported list, skip)
};

/** Infer a default currency from the browser's timezone. Falls back to USD. */
export function detectCurrencyFromLocale(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_CURRENCY_MAP[tz]) {
      return TIMEZONE_CURRENCY_MAP[tz];
    }
  } catch {
    // Intl unavailable
  }
  return "USD";
}
