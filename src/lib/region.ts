// Regional presets. FinTrack is for Bangladesh *and* everyone else: BD users
// keep bKash/Nagad/Rocket, BD banks and ৳ as first-class defaults, and anyone
// else gets equally sensible global ones. The region follows the profile's
// currency (BDT → 'bd'), so changing currency in Profile switches presets, and
// a user's own customised lists (lib/paymentMethodPrefs.ts) always win.

export type Region = 'bd' | 'global'

export function regionForCurrency(currency: string | null | undefined): Region {
  return currency === 'BDT' ? 'bd' : 'global'
}

// Wallets are stored as "MFS - <name>" whatever the region — the prefix is
// what PaymentMethodPicker / getMethodGroup use to recognise the group.
export const WALLET_PREFIX = 'MFS - '

export const REGION_PRESETS = {
  bd: {
    walletLabel: 'MFS',
    walletProviderLabel: 'MFS provider',
    wallets: ['MFS - bKash', 'MFS - Nagad', 'MFS - Rocket'],
    bankAccounts: ['BRAC Bank Savings', 'Islami Bank', 'Prime Bank', 'Dutch Bangla Bank', 'Other'],
  },
  global: {
    walletLabel: 'Wallet',
    walletProviderLabel: 'Wallet / app',
    wallets: ['MFS - PayPal', 'MFS - Wise', 'MFS - Revolut', 'MFS - Apple Pay', 'MFS - Google Pay'],
    bankAccounts: ['Main bank account', 'Savings account', 'Other'],
  },
} as const

// "MFS - bKash" → "bKash". Everything else is shown as stored.
export function formatPaymentMethod(method: string): string {
  return method.startsWith(WALLET_PREFIX) ? method.slice(WALLET_PREFIX.length) : method
}

// ── Detection (used once, on a new account's first sign-in) ──────────────

// ISO 3166 country → ISO 4217 currency for the countries FinTrack users most
// often come from. Anything unmapped falls back to USD; the user can change it.
const COUNTRY_CURRENCY: Record<string, string> = {
  BD: 'BDT', IN: 'INR', PK: 'PKR', NP: 'NPR', LK: 'LKR',
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  SG: 'SGD', MY: 'MYR', JP: 'JPY', CN: 'CNY', KR: 'KRW',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', OM: 'OMR', BH: 'BHD',
  SE: 'SEK', DK: 'DKK', NO: 'NOK', CH: 'CHF',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR', FI: 'EUR',
  AT: 'EUR', BE: 'EUR', PT: 'EUR', GR: 'EUR', LU: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
}

// Timezone → country, for browsers whose language tag has no region ("en").
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Dhaka': 'BD', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK',
  'Asia/Kathmandu': 'NP', 'Asia/Colombo': 'LK', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Seoul': 'KR', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Europe/London': 'GB', 'Europe/Dublin': 'IE',
  'Europe/Stockholm': 'SE', 'Europe/Copenhagen': 'DK', 'Europe/Oslo': 'NO', 'Europe/Zurich': 'CH',
  'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL', 'Europe/Helsinki': 'FI', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function detectCountry(
  languages: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [],
  timezone: string = detectTimezone(),
): string | null {
  // The timezone is the better signal for where someone actually is — an
  // international student keeps their home language setting abroad.
  if (TIMEZONE_COUNTRY[timezone]) return TIMEZONE_COUNTRY[timezone]
  if (timezone.startsWith('America/')) return 'US'
  for (const tag of languages) {
    const region = tag.split('-')[1]
    if (region && /^[A-Z]{2}$/i.test(region)) return region.toUpperCase()
  }
  return null
}

export function currencyForCountry(country: string | null): string {
  return (country && COUNTRY_CURRENCY[country]) || 'USD'
}

export function detectSettings(): { currency: string; timezone: string; region: Region } {
  const timezone = detectTimezone()
  const currency = currencyForCountry(detectCountry(undefined, timezone))
  return { currency, timezone, region: regionForCurrency(currency) }
}
