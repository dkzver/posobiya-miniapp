// Константы 2026 года. Источники проверены 05.11.2026.
export const DATA = Object.freeze({
  MROT: 27093,
  PM_DUSH: 18939,
  PM_CHILD: 18371,
  PM_TRUD: 20644,
  INDEX_2026: 1.056,

  BIR_MAX_DAY: 6827.4,
  BIR_MIN_DAY: 890.73,
  BIR_MAX: { 140: 955836.0, 156: 1065074.4, 194: 1324515.6 },
  BIR_MIN: { 140: 124702.2, 156: 138953.88, 194: 172801.62 },
  EARNINGS_CAP: { 2024: 2225000, 2025: 2759000 },

  CARE_MAX: 83021.18,
  CARE_MIN_FIXED: 10669.64,
  CARE_MIN_WORKING: 10837.2,

  BIRTH_LUMP: 28450.45,
  MATCAPITAL_FIRST: 728921.9,
  MATCAPITAL_SECOND: 963243.0,
  MATCAPITAL_DOPLATA: 234321.0,

  UNEMPLOYMENT_MIN: 1863,
  UNEMPLOYMENT_MAX: 15886,

  ZERO_INCOME_THRESHOLD: 216744,
});

export const DISTRICTS = [
  { value: 1, label: 'Без коэффициента' },
  { value: 1.15, label: '1,15' },
  { value: 1.3, label: '1,3' },
  { value: 1.4, label: '1,4' },
  { value: 1.5, label: '1,5' },
  { value: 1.7, label: '1,7' },
  { value: 1.8, label: '1,8' },
  { value: 2, label: '2,0' },
];

export const SOURCES = [
  {
    title: 'Пособия и МРОТ 2026 — таблица сумм',
    url: 'https://www.26-2.ru/art/358051-detskie-posobiya-razmery',
  },
  {
    title: 'Единое пособие: размеры и правила',
    url: 'https://xn--h1alcedd.xn--d1aqf.xn--p1ai/instructions/detskoe-edinoe-posobie',
  },
  {
    title: 'Материнский капитал 2026 — СФР',
    url: 'https://sfr.gov.ru/grazhdanam/semyam_s_detmi/materinskij_kapital/razmer',
  },
  {
    title: 'Пособие по уходу до 1,5 лет — КонсультантПлюс',
    url: 'https://www.consultant.ru/law/ref/poleznye-sovety/detskie-posobija/posobie-po-uhodu-za-rebenkom',
  },
  {
    title: 'Пособие по безработице 2026',
    url: 'https://kontur.ru/articles/2744',
  },
  {
    title: 'Оценка нуждаемости — СФР',
    url: 'https://sfr.gov.ru/grazhdanam/semyam_s_detmi/edinoe_posobie/ocenka',
  },
];

export const DISCLAIMER =
  'Расчёт предварительный. Итоговую сумму определяет СФР или работодатель по документам.';
