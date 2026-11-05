// Расчёты пособий. Порт app/calc.py — формулы и округление должны совпадать.
import { DATA } from './data.js';
import { formatMoney } from './format.js';

const MAX_INPUT = 1e12;

/** Округление до копеек, как Decimal ROUND_HALF_UP в Python. */
export function round2(value) {
  const scaled = value * 100;
  const adjusted = scaled + Math.abs(scaled) * Number.EPSILON;
  return Math.round(adjusted) / 100;
}

export function parseMoney(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, '')
    .replace(/\s+/g, '')
    .replace(/₽/g, '')
    .replace(/руб\.?/g, '');

  if (!/^\d+(?:[.,]\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > MAX_INPUT) return null;
  return value;
}

export function parseCount(raw, maximum = 20) {
  const value = parseMoney(raw);
  if (value === null || !Number.isInteger(value)) return null;
  if (value < 1 || value > maximum) return null;
  return value;
}

function cappedEarnings(earnings2024, earnings2025) {
  return (
    Math.min(earnings2024, DATA.EARNINGS_CAP[2024]) +
    Math.min(earnings2025, DATA.EARNINGS_CAP[2025])
  );
}

export function calculateBir({
  earnings2024 = 0,
  earnings2025 = 0,
  days = 140,
  excludedDays = 0,
  tenure6m = true,
  district = 1,
} = {}) {
  if (!DATA.BIR_MIN[days]) {
    throw new Error('days must be 140, 156 or 194');
  }

  const base = cappedEarnings(earnings2024, earnings2025);
  const denominator = excludedDays >= 0 && excludedDays < 730 ? 730 - excludedDays : 730;
  const average = round2(base / denominator);

  const minDay = DATA.BIR_MIN_DAY * district;
  const minAmount = round2(minDay * days);
  const maxAmount = DATA.BIR_MAX[days];

  let daily;
  let limitedBy = 'earnings';
  let comment = '';

  if (!tenure6m) {
    daily = minDay;
    limitedBy = 'tenure';
    comment =
      'При страховом стаже меньше 6 месяцев пособие считают от МРОТ ' +
      '(с районным коэффициентом), но не выше МРОТ за полный месяц.';
  } else {
    daily = Math.max(average, minDay);
    if (average < minDay) {
      limitedBy = 'min';
      comment = 'Средний заработок ниже минимума — пособие считается от МРОТ.';
    }
    if (average >= DATA.BIR_MAX_DAY) {
      daily = DATA.BIR_MAX_DAY;
      limitedBy = 'max';
      comment =
        'Учтён предельный заработок: за 2024 год — 2 225 000 ₽, ' +
        'за 2025 год — 2 759 000 ₽.';
    }
  }

  let amount = round2(daily * days);
  if (amount < minAmount) amount = minAmount;
  if (amount > maxAmount) amount = maxAmount;

  return {
    amount,
    daily: round2(daily),
    base,
    days,
    minAmount,
    maxAmount,
    limitedBy,
    comment,
  };
}

export function calculateCareWorking({
  earnings2024 = 0,
  earnings2025 = 0,
  children = 1,
  excludedDays = 0,
  district = 1,
} = {}) {
  const base = cappedEarnings(earnings2024, earnings2025);
  const denominator = excludedDays >= 0 && excludedDays < 730 ? 730 - excludedDays : 730;
  const averageDay = Math.min(round2(base / denominator), DATA.BIR_MAX_DAY);
  const averageMonth = averageDay * 30.4;

  const minPerChild = Math.max(DATA.CARE_MIN_WORKING, DATA.CARE_MIN_FIXED) * district;
  let perChild = averageMonth * 0.4;
  perChild = Math.max(minPerChild, Math.min(perChild, DATA.CARE_MAX));

  let total = perChild * children;
  let cappedByEarnings = false;
  if (children > 1 && total > averageMonth) {
    total = Math.max(averageMonth, minPerChild * children);
    cappedByEarnings = true;
  }

  return {
    monthly: round2(total),
    perChild: round2(perChild),
    children,
    minMonthly: round2(minPerChild * children),
    maxMonthly: round2(DATA.CARE_MAX * children),
    cappedByEarnings,
  };
}

export function calculateCareUnemployed({ children = 1, district = 1 } = {}) {
  const perChild = DATA.CARE_MIN_FIXED * district;
  return {
    monthly: round2(perChild * children),
    perChild: round2(perChild),
    children,
    minMonthly: round2(perChild * children),
    maxMonthly: round2(perChild * children),
    cappedByEarnings: false,
  };
}

export function calculateUnified({
  income12m = 0,
  familySize = 1,
  children = 1,
  pmChild = DATA.PM_CHILD,
  pmDush = DATA.PM_DUSH,
  propertyOk = true,
  zeroIncomeOk = true,
} = {}) {
  const monthlyIncome = income12m / 12;
  const avgIncome = monthlyIncome / familySize;

  const reasons = [];
  if (avgIncome >= pmDush) {
    reasons.push(
      'Среднедушевой доход выше прожиточного минимума на душу населения ' +
        `(${formatMoney(pmDush)}).`,
    );
  }
  if (!propertyOk) {
    reasons.push('Имущество семьи превышает список, разрешённый для единого пособия.');
  }
  if (!zeroIncomeOk) {
    reasons.push(
      'У взрослого члена семьи нет дохода и нет уважительной причины ' +
        '(правило нулевого дохода).',
    );
  }

  if (reasons.length > 0) {
    return {
      eligible: false,
      rate: null,
      perChild: 0,
      total: 0,
      monthlyIncome: round2(monthlyIncome),
      avgIncome: round2(avgIncome),
      pmDush,
      pmChild,
      children,
      familySize,
      reasons,
      warnings: [],
    };
  }

  let rate = 0.5;
  for (const candidate of [0.5, 0.75, 1]) {
    rate = candidate;
    if ((monthlyIncome + candidate * pmChild * children) / familySize >= pmDush) {
      break;
    }
  }

  const perChild = round2(pmChild * rate);
  const total = round2(perChild * children);

  return {
    eligible: true,
    rate,
    perChild,
    total,
    monthlyIncome: round2(monthlyIncome),
    avgIncome: round2(avgIncome),
    pmDush,
    pmChild,
    children,
    familySize,
    reasons: [],
    warnings: [
      'Проверки сделаны по вашим ответам. СФР проверяет доходы, имущество ' +
        'и вклады по своим базам — итог может отличаться.',
    ],
  };
}
