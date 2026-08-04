export type KPayCountry = {
  code: string;
  name: string;
  phonePrefix: string;
  providers: Array<{ code: string; label: string }>;
};

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
    name: 'Congo Brazzaville',
    phonePrefix: '+242',
    providers: [
      { code: 'AIRTEL_COG', label: 'Airtel Money' },
      { code: 'MTN_MOMO_COG', label: 'MTN MoMo' },
    ],
  },
  { code: 'GA', name: 'Gabon', phonePrefix: '+241', providers: [{ code: 'AIRTEL_GAB', label: 'Airtel Money' }] },
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
  {
    code: 'SN',
    name: 'Sénégal',
    phonePrefix: '+221',
    providers: [
      { code: 'FREE_SEN', label: 'Free Money' },
      { code: 'ORANGE_SEN', label: 'Orange Money' },
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

export function getKPayCountry(code?: string | null): KPayCountry {
  return KPAY_COUNTRIES.find((country) => country.code === code) ?? KPAY_COUNTRIES[3];
}
