export type KPayCountry = {
  code: string;
  name: string;
  phonePrefix: string;
  providers: Array<{ code: string; label: string }>;
};

/** Pays affichés côté client / couverture FidexaPay */
/** Couverture FidexaPay : BJ, CM, CI, CD, CG, SN, GA */
export const FIDEXA_COVERAGE_CODES = ['BJ', 'CM', 'CI', 'CD', 'CG', 'SN', 'GA'] as const;

export type FidexaCoverageCode = (typeof FIDEXA_COVERAGE_CODES)[number];

export const KPAY_COUNTRIES: KPayCountry[] = [
  {
    code: 'BJ',
    name: 'Bénin',
    phonePrefix: '+229',
    providers: [
      { code: 'MTN_MOMO_BEN', label: 'MTN MoMo' },
      { code: 'MOOV_BEN', label: 'Moov Money' },
    ],
  },
  {
    code: 'CM',
    name: 'Cameroun',
    phonePrefix: '+237',
    providers: [
      { code: 'MTN_MOMO_CMR', label: 'MTN MoMo' },
      { code: 'ORANGE_CMR', label: 'Orange Money' },
    ],
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    phonePrefix: '+225',
    providers: [
      { code: 'MTN_MOMO_CIV', label: 'MTN MoMo' },
      { code: 'ORANGE_CIV', label: 'Orange Money' },
      { code: 'MOOV_CIV', label: 'Moov Money' },
      { code: 'WAVE_CIV', label: 'Wave' },
    ],
  },
  {
    code: 'CD',
    name: 'RD Congo',
    phonePrefix: '+243',
    providers: [
      { code: 'VODACOM_MPESA_COD', label: 'Vodacom M-Pesa' },
      { code: 'AIRTEL_COD', label: 'Airtel Money' },
      { code: 'ORANGE_COD', label: 'Orange Money' },
    ],
  },
  {
    code: 'CG',
    name: 'Congo',
    phonePrefix: '+242',
    providers: [
      { code: 'AIRTEL_COG', label: 'Airtel Money' },
      { code: 'MTN_MOMO_COG', label: 'MTN MoMo' },
    ],
  },
  {
    code: 'GA',
    name: 'Gabon',
    phonePrefix: '+241',
    providers: [{ code: 'AIRTEL_GAB', label: 'Airtel Money' }],
  },
  {
    code: 'SN',
    name: 'Sénégal',
    phonePrefix: '+221',
    providers: [
      { code: 'FREE_SEN', label: 'Free Money' },
      { code: 'ORANGE_SEN', label: 'Orange Money' },
      { code: 'WAVE_SEN', label: 'Wave' },
    ],
  },
  // Autres pays KPay (hors couverture Fidexa — utiles pour API / settle)
  { code: 'KE', name: 'Kenya', phonePrefix: '+254', providers: [{ code: 'MPESA_KEN', label: 'M-Pesa' }] },
  {
    code: 'RW',
    name: 'Rwanda',
    phonePrefix: '+250',
    providers: [
      { code: 'AIRTEL_RWA', label: 'Airtel Money' },
      { code: 'MTN_MOMO_RWA', label: 'MTN MoMo' },
    ],
  },
  { code: 'SL', name: 'Sierra Leone', phonePrefix: '+232', providers: [{ code: 'ORANGE_SLE', label: 'Orange Money' }] },
  {
    code: 'UG',
    name: 'Ouganda',
    phonePrefix: '+256',
    providers: [
      { code: 'AIRTEL_OAPI_UGA', label: 'Airtel Money' },
      { code: 'MTN_MOMO_UGA', label: 'MTN MoMo' },
    ],
  },
  {
    code: 'ZM',
    name: 'Zambie',
    phonePrefix: '+260',
    providers: [
      { code: 'AIRTEL_OAPI_ZMB', label: 'Airtel Money' },
      { code: 'MTN_MOMO_ZMB', label: 'MTN MoMo' },
      { code: 'ZAMTEL_ZMB', label: 'Zamtel Money' },
    ],
  },
];

/** Liste pays = couverture Fidexa (UI client / paiement) */
export const COVERAGE_COUNTRIES: KPayCountry[] = FIDEXA_COVERAGE_CODES.map(
  (code) => KPAY_COUNTRIES.find((c) => c.code === code)!
).filter(Boolean);

export function getKPayCountry(code?: string | null): KPayCountry {
  return (
    KPAY_COUNTRIES.find((country) => country.code === code) ??
    KPAY_COUNTRIES.find((country) => country.code === 'CD') ??
    KPAY_COUNTRIES[0]
  );
}

export function isCoverageCountry(code?: string | null): boolean {
  return !!code && (FIDEXA_COVERAGE_CODES as readonly string[]).includes(code);
}
