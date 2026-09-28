const SUPPORTED_CURRENCIES = {
  USD: { name: 'US Dollar' },
  EUR: { name: 'Euro' },
  GBP: { name: 'British Pound Sterling' },
  JPY: { name: 'Japanese Yen' },
  CAD: { name: 'Canadian Dollar' },
  AUD: { name: 'Australian Dollar' },
  CHF: { name: 'Swiss Franc' },
  CNY: { name: 'Chinese Yuan' },
  INR: { name: 'Indian Rupee' },
  SEK: { name: 'Swedish Krona' },
  NOK: { name: 'Norwegian Krone' },
  DKK: { name: 'Danish Krone' },
  NZD: { name: 'New Zealand Dollar' },
  MXN: { name: 'Mexican Peso' },
  SGD: { name: 'Singapore Dollar' },
  HKD: { name: 'Hong Kong Dollar' },
  TRY: { name: 'Turkish Lira' },
  RUB: { name: 'Russian Ruble' },
  BRL: { name: 'Brazilian Real' },
  ZAR: { name: 'South African Rand' },
  KRW: { name: 'South Korean Won' },
  AED: { name: 'UAE Dirham' },
  SAR: { name: 'Saudi Riyal' },
  PLN: { name: 'Polish Zloty' },
  CZK: { name: 'Czech Koruna' },
  HUF: { name: 'Hungarian Forint' },
  ILS: { name: 'Israeli New Shekel' },
  PHP: { name: 'Philippine Peso' },
  IDR: { name: 'Indonesian Rupiah' },
  THB: { name: 'Thai Baht' },
  MYR: { name: 'Malaysian Ringgit' },
  VND: { name: 'Vietnamese Dong' },
  PKR: { name: 'Pakistani Rupee' },
  EGP: { name: 'Egyptian Pound' },
  NGN: { name: 'Nigerian Naira' },
  BHD: { name: 'Bahraini Dinar' },
  QAR: { name: 'Qatari Riyal' },
  KWD: { name: 'Kuwaiti Dinar' },
  OMR: { name: 'Omani Rial' },
  JOD: { name: 'Jordanian Dinar' },
  BND: { name: 'Brunei Dollar' },
  LKR: { name: 'Sri Lankan Rupee' },
  MAD: { name: 'Moroccan Dirham' },
  TND: { name: 'Tunisian Dinar' }
};

const SAMPLE_CURRENCY_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 157.2,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.89,
  CNY: 7.24,
  INR: 83.4,
  SEK: 10.35,
  NOK: 10.7,
  DKK: 6.91,
  NZD: 1.63,
  MXN: 18.35,
  SGD: 1.35,
  HKD: 7.8,
  TRY: 32.5,
  RUB: 92.4,
  BRL: 5.52,
  ZAR: 18.3,
  KRW: 1385,
  AED: 3.67,
  SAR: 3.75,
  PLN: 3.96,
  CZK: 22.6,
  HUF: 368,
  ILS: 3.6,
  PHP: 58.4,
  IDR: 16250,
  THB: 35.2,
  MYR: 4.72,
  VND: 24500,
  PKR: 279,
  EGP: 49.5,
  NGN: 1500,
  BHD: 0.38,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.385,
  JOD: 0.71,
  BND: 1.35,
  LKR: 299,
  MAD: 10.1,
  TND: 3.15
};

const currencyNameFormatter = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'currency' })
  : null;

let currencyRates = { ...SAMPLE_CURRENCY_RATES };

function getCurrencyLabel(code) {
  const normalized = String(code || '').toUpperCase();
  if (currencyNameFormatter) {
    try {
      const named = currencyNameFormatter.of(normalized);
      if (named) return named;
    } catch (error) {
      // fallback below
    }
  }

  return SUPPORTED_CURRENCIES[normalized]?.name || normalized;
}

function normalizeCurrencyRates(rates) {
  const normalized = {};
  Object.entries(rates || {}).forEach(([code, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[String(code).toUpperCase()] = Number(value);
    }
  });

  if (!normalized.USD) normalized.USD = 1;
  return normalized;
}

function getCurrencyOptions() {
  const source = Object.keys(currencyRates).length ? currencyRates : SUPPORTED_CURRENCIES;
  return Object.fromEntries(
    Object.keys(source)
      .map(code => [String(code).toUpperCase(), { name: getCurrencyLabel(code) }])
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

async function loadCurrencyRates() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }

    const data = await response.json();
    if (data && data.rates) {
      currencyRates = normalizeCurrencyRates(data.rates);
      return currencyRates;
    }
  } catch (error) {
    console.warn('Using fallback currency rates:', error.message);
  }

  currencyRates = { ...SAMPLE_CURRENCY_RATES };
  return currencyRates;
}

function convertCurrencyValue(fromKey, toKey, value) {
  const normalizedFrom = String(fromKey || '').toUpperCase();
  const normalizedTo = String(toKey || '').toUpperCase();
  const rates = currencyRates && Object.keys(currencyRates).length ? currencyRates : SAMPLE_CURRENCY_RATES;

  if (!rates[normalizedFrom] || !rates[normalizedTo]) {
    throw new Error('Unsupported currency');
  }

  if (normalizedFrom === normalizedTo) {
    return value;
  }

  return (value / rates[normalizedFrom]) * rates[normalizedTo];
}
