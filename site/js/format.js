const moneyFormat = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

export function formatMoney(value, withCurrency = true) {
  const text = moneyFormat.format(value);
  return withCurrency ? `${text} ₽` : text;
}

export function formatInt(value) {
  return `${intFormat.format(value)} ₽`;
}

export function formatPercent(rate) {
  const percent = rate * 100;
  const text = Number.isInteger(percent)
    ? String(percent)
    : percent.toFixed(1).replace('.', ',');
  return `${text} %`;
}

export function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
