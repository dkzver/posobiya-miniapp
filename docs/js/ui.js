import { DATA, DISTRICTS, SOURCES, DISCLAIMER } from './data.js';
import {
  calculateBir,
  calculateCareUnemployed,
  calculateCareWorking,
  calculateUnified,
  parseMoney,
} from './calc.js';
import { formatMoney, formatInt, formatPercent } from './format.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['bir', 'care', 'unified', 'birth', 'reference'];

const districtOptions = DISTRICTS.map(
  (item) => `<option value="${item.value}">${item.label}</option>`,
).join('');

function segmented(name, options, selected) {
  const items = options
    .map(
      (option) => `
      <label>
        <input type="radio" name="${name}" value="${option.value}" ${
          String(option.value) === String(selected) ? 'checked' : ''
        }>
        <span>${option.label}</span>
      </label>`,
    )
    .join('');
  return `<div class="segmented" role="radiogroup">${items}</div>`;
}

function field(id, label, { placeholder = '', hint = '', value = '', select = false } = {}) {
  const control = select
    ? `<select class="input select" id="${id}">${districtOptions}</select>`
    : `<input class="input" id="${id}" type="text" inputmode="numeric" autocomplete="off"
         placeholder="${placeholder}" value="${value}">`;

  return `
    <div class="field">
      <label for="${id}">${label}</label>
      ${control}
      ${hint ? `<p class="hint">${hint}</p>` : ''}
      <p class="error" id="err-${id}" hidden></p>
    </div>`;
}

function stat(label, value) {
  return `<div><span>${label}</span><b>${value}</b></div>`;
}

function childrenWord(count) {
  if (count % 10 === 1 && count % 100 !== 11) return 'ребёнок';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'ребёнка';
  }
  return 'детей';
}

// --- Шаблоны экранов ---------------------------------------------------------

function birTemplate() {
  return `
  <section class="view" id="view-bir" role="tabpanel" aria-label="Декретные">
    <div class="card">
      <h2>Декретные</h2>
      <p class="sub">Пособие по беременности и родам. Считаем по заработку за 2024–2025 годы.</p>
      <form id="form-bir" novalidate>
        <div class="field">
          <span class="label">Длительность отпуска</span>
          ${segmented(
            'bir-days',
            [
              { value: 140, label: '140' },
              { value: 156, label: '156' },
              { value: 194, label: '194' },
            ],
            140,
          )}
          <p class="hint">140 — обычные роды, 156 — осложнённые, 194 — двойня или тройня.</p>
        </div>

        <div class="row">
          ${field('bir-earn2024', 'Заработок за 2024', { placeholder: '0' })}
          ${field('bir-earn2025', 'Заработок за 2025', { placeholder: '0' })}
        </div>
        <p class="hint" style="margin:-8px 0 14px">До вычета НДФЛ. Если не работали — оставьте 0.</p>

        ${field('bir-excluded', 'Исключаемые дни', {
          placeholder: '0',
          hint: 'Больничные, прошлый декрет или отпуск по уходу за два года. Если не было — 0.',
        })}

        <div class="field">
          <span class="label">Страховой стаж</span>
          ${segmented(
            'bir-tenure',
            [
              { value: '1', label: '6 месяцев и больше' },
              { value: '0', label: 'Меньше 6 месяцев' },
            ],
            '1',
          )}
        </div>

        ${field('bir-district', 'Районный коэффициент', { select: true })}

        <button class="btn" type="submit">Рассчитать</button>
      </form>
      <div class="result" id="result-bir" hidden aria-live="polite"></div>
    </div>
  </section>`;
}

function careTemplate() {
  return `
  <section class="view" id="view-care" role="tabpanel" aria-label="Пособие до 1,5 лет" hidden>
    <div class="card">
      <h2>Пособие до 1,5 лет</h2>
      <p class="sub">Ежемесячная выплата на ребёнка до полутора лет.</p>
      <form id="form-care" novalidate>
        <div class="field">
          <span class="label">Занятость</span>
          ${segmented(
            'care-work',
            [
              { value: '1', label: 'Работаю' },
              { value: '0', label: 'Не работаю' },
            ],
            '1',
          )}
        </div>

        <div id="care-earnings">
          <div class="row">
            ${field('care-earn2024', 'Заработок за 2024', { placeholder: '0' })}
            ${field('care-earn2025', 'Заработок за 2025', { placeholder: '0' })}
          </div>
          <p class="hint" style="margin:-8px 0 14px">До вычета НДФЛ. Если не работали — оставьте 0.</p>
        </div>

        ${field('care-children', 'Детей до 1,5 лет', { value: '1' })}
        ${field('care-district', 'Районный коэффициент', { select: true })}

        <button class="btn" type="submit">Рассчитать</button>
      </form>
      <div class="result" id="result-care" hidden aria-live="polite"></div>
    </div>
  </section>`;
}

function unifiedTemplate() {
  return `
  <section class="view" id="view-unified" role="tabpanel" aria-label="Единое пособие" hidden>
    <div class="card">
      <h2>Единое пособие</h2>
      <p class="sub">Проверим доход, имущество и правило нулевого дохода.</p>
      <form id="form-unified" novalidate>
        ${field('uni-pm', 'ПМ на ребёнка в регионе', {
          value: String(DATA.PM_CHILD),
          hint: 'Федеральный ПМ на ребёнка — 18 371 ₽. В вашем регионе сумма может быть другой.',
        })}

        ${field('uni-income', 'Доход семьи за 12 месяцев', {
          placeholder: '0',
          hint: 'Зарплата до НДФЛ, пенсии, стипендии, доходы от бизнеса, проценты по вкладам, алименты.',
        })}

        <div class="row">
          ${field('uni-family', 'Человек в семье', { value: '4' })}
          ${field('uni-children', 'Детей 0–17 лет', { value: '1' })}
        </div>
        <p class="hint" style="margin:-8px 0 14px">Считаем заявителя, супруга и детей до 17 лет (до 23 — если учатся очно).</p>

        <div class="field">
          <span class="label">Имущество сверх разрешённого списка</span>
          ${segmented(
            'uni-property',
            [
              { value: '1', label: 'Есть' },
              { value: '0', label: 'Нет' },
            ],
            '0',
          )}
          <p class="hint">Две квартиры, два автомобиля, нежилая недвижимость, дорогой автомобиль.</p>
        </div>

        <div class="field">
          <span class="label">У всех взрослых есть доход или уважительная причина</span>
          ${segmented(
            'uni-zero',
            [
              { value: '1', label: 'Да' },
              { value: '0', label: 'Нет' },
            ],
            '1',
          )}
          <p class="hint">Порог — 8 МРОТ (216 744 ₽) на каждого взрослого. Уважительные причины: уход за ребёнком до 3 лет, инвалидом, человеком 80+, безработица до 6 месяцев, очное обучение, служба в армии.</p>
        </div>

        <button class="btn" type="submit">Рассчитать</button>
      </form>
      <div class="result" id="result-unified" hidden aria-live="polite"></div>
    </div>
  </section>`;
}

function birthTemplate() {
  return `
  <section class="view" id="view-birth" role="tabpanel" aria-label="Выплаты при рождении" hidden>
    <div class="card">
      <h2>При рождении</h2>
      <p class="sub">Федеральные выплаты 2026 года.</p>

      <div class="payout">
        <span>Единовременное пособие<small>Один из родителей, независимо от дохода</small></span>
        <b>${formatMoney(DATA.BIRTH_LUMP)}</b>
      </div>
      <div class="payout">
        <span>Пособие по уходу до 1,5 лет<small>40 % заработка, но не ниже и не выше лимитов</small></span>
        <b>${formatMoney(DATA.CARE_MIN_WORKING)} – ${formatMoney(DATA.CARE_MAX)}</b>
      </div>
      <div class="payout">
        <span>Единое пособие<small>Если среднедушевой доход ниже ПМ на душу</small></span>
        <b>50–100 % ПМ</b>
      </div>
    </div>

    <div class="card">
      <h2>Материнский капитал</h2>
      <div class="payout">
        <span>На первого ребёнка</span>
        <b>${formatMoney(DATA.MATCAPITAL_FIRST)}</b>
      </div>
      <div class="payout">
        <span>На второго, если на первого не получали</span>
        <b>${formatMoney(DATA.MATCAPITAL_SECOND)}</b>
      </div>
      <div class="payout">
        <span>Доплата, если капитал за первого уже получен</span>
        <b>${formatMoney(DATA.MATCAPITAL_DOPLATA)}</b>
      </div>
      <p class="note">Маткапитал оформляется автоматически по данным ЗАГС. Распорядиться им можно после достижения ребёнком 3 лет или сразу — на ипотеку и другие цели, предусмотренные законом.</p>
    </div>

    <div class="card">
      <h2>Как получить</h2>
      <p class="sub" style="margin-bottom:0">Единовременное пособие и пособие по уходу — через СФР или работодателя. Единое пособие — заявление в СФР или на Госуслугах, срок рассмотрения до 35 рабочих дней.</p>
    </div>
  </section>`;
}

function referenceTemplate() {
  const rows = [
    ['МРОТ', formatInt(DATA.MROT)],
    ['ПМ на душу населения', formatInt(DATA.PM_DUSH)],
    ['ПМ на ребёнка', formatInt(DATA.PM_CHILD)],
    ['ПМ для трудоспособных', formatInt(DATA.PM_TRUD)],
    [
      'БиР, 140 дней',
      `${formatMoney(DATA.BIR_MIN[140])} – ${formatMoney(DATA.BIR_MAX[140])}`,
    ],
    [
      'Уход до 1,5 лет',
      `${formatMoney(DATA.CARE_MIN_WORKING)} – ${formatMoney(DATA.CARE_MAX)}`,
    ],
    ['При рождении', formatMoney(DATA.BIRTH_LUMP)],
    ['Маткапитал, первый', formatMoney(DATA.MATCAPITAL_FIRST)],
    ['Маткапитал, второй', formatMoney(DATA.MATCAPITAL_SECOND)],
    ['Доплата за второго', formatMoney(DATA.MATCAPITAL_DOPLATA)],
    [
      'Безработица',
      `${formatMoney(DATA.UNEMPLOYMENT_MIN)} – ${formatMoney(DATA.UNEMPLOYMENT_MAX)}`,
    ],
  ];

  return `
  <section class="view" id="view-reference" role="tabpanel" aria-label="Суммы 2026" hidden>
    <div class="card">
      <h2>Суммы и лимиты 2026</h2>
      <p class="sub">Федеральные значения без районного коэффициента.</p>
      <table class="amounts">
        ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('')}
      </table>
    </div>

    <div class="card">
      <h2>Источники</h2>
      <ul class="sources">
        ${SOURCES.map(
          (source) =>
            `<li><a href="${source.url}" target="_blank" rel="noopener">${source.title}</a></li>`,
        ).join('')}
      </ul>
      <p class="note">Данные на 05.11.2026. В районах с коэффициентом минимальные суммы выше. ${DISCLAIMER}</p>
    </div>
  </section>`;
}

// --- Результаты --------------------------------------------------------------

function renderBir(result) {
  const comment = result.comment ? `<p class="note">${result.comment}</p>` : '';
  return `
    <div class="result-card">
      <div class="result-kicker">Пособие по беременности и родам</div>
      <div class="result-value">${formatMoney(result.amount)}</div>
      <div class="result-caption">за ${result.days} дней</div>
      <div class="result-grid">
        ${stat('Средний дневной заработок', formatMoney(result.daily))}
        ${stat('Минимум', formatMoney(result.minAmount))}
        ${stat('Максимум', formatMoney(result.maxAmount))}
      </div>
      ${comment}
      <p class="note">НДФЛ с пособия не удерживают. Если в 2024–2025 годах вы были в декрете или отпуске по уходу, годы можно заменить на более ранние — пособие может быть выше.</p>
      <p class="note note--muted">${DISCLAIMER}</p>
    </div>`;
}

function renderCare(result, working) {
  const perChild =
    result.children > 1
      ? stat('На каждого ребёнка', formatMoney(result.perChild))
      : '';

  const baseNotes = working
    ? 'Пособие платят 40 % среднего заработка. С 2024 года его сохраняют, если вы вышли на работу досрочно или работаете на неполную ставку.'
    : `Неработающим платят фиксированную сумму — ${formatMoney(result.perChild)} на каждого ребёнка (с районным коэффициентом). Если вы получаете пособие по безработице, пособие по уходу не назначат.`;

  const capNote = result.cappedByEarnings
    ? '<p class="note">Сумма на нескольких детей ограничена 100 % среднего заработка.</p>'
    : '';

  return `
    <div class="result-card">
      <div class="result-kicker">Пособие по уходу до 1,5 лет</div>
      <div class="result-value">${formatMoney(result.monthly)}</div>
      <div class="result-caption">в месяц</div>
      <div class="result-grid">
        ${stat('За 18 месяцев', `≈ ${formatMoney(result.monthly * 18)}`)}
        ${perChild}
        ${stat('Минимум за месяц', formatMoney(result.minMonthly))}
        ${stat('Максимум за месяц', formatMoney(result.maxMonthly))}
      </div>
      ${capNote}
      <p class="note">${baseNotes}</p>
      <p class="note note--muted">${DISCLAIMER}</p>
    </div>`;
}

function renderUnified(result) {
  if (!result.eligible) {
    return `
      <div class="result-card is-negative">
        <div class="result-kicker">Единое пособие</div>
        <div class="result-value result-value--small">По предварительной оценке права нет</div>
        <div class="result-grid">
          ${stat('Среднедушевой доход', formatMoney(result.avgIncome))}
          ${stat('ПМ на душу', formatMoney(result.pmDush))}
        </div>
        <p class="note"><b>Причины:</b></p>
        <ul class="reasons">${result.reasons.map((reason) => `<li>${reason}</li>`).join('')}</ul>
        <p class="note">Если доход изменился или причина отсутствия дохода уважительная — подайте заявление в СФР: фонд проверит данные индивидуально.</p>
        <p class="note note--muted">${DISCLAIMER}</p>
      </div>`;
  }

  const caption =
    result.children === 1
      ? 'в месяц на ребёнка'
      : `в месяц на ${result.children} ${childrenWord(result.children)}`;

  return `
    <div class="result-card">
      <div class="result-kicker">Единое пособие</div>
      <div class="result-value">${formatMoney(result.total)}</div>
      <div class="result-caption">${caption}</div>
      <div class="result-grid">
        ${stat('Размер', `${formatPercent(result.rate)} ПМ`)}
        ${stat('На каждого ребёнка', formatMoney(result.perChild))}
        ${stat('Среднедушевой доход', formatMoney(result.avgIncome))}
        ${stat('ПМ на душу', formatMoney(result.pmDush))}
      </div>
      <div class="checks">
        <span class="check">доход ✓</span>
        <span class="check">имущество ✓</span>
        <span class="check">нулевой доход ✓</span>
      </div>
      <p class="note">Пособие назначают на 12 месяцев, потом продлевают по заявлению. Порог дохода проверен по федеральному ПМ на душу — в регионе он может отличаться.</p>
      <p class="note note--muted">${result.warnings.join(' ')}</p>
    </div>`;
}

// --- Валидация и вывод -------------------------------------------------------

function setError(id, message) {
  const input = $(id);
  const error = $(`err-${id}`);
  if (!input || !error) return;
  input.classList.toggle('is-invalid', Boolean(message));
  error.textContent = message ?? '';
  error.hidden = !message;
}

function radioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function readMoney(id) {
  const raw = $(id).value.trim();
  if (!raw) {
    setError(id, '');
    return 0;
  }
  const value = parseMoney(raw);
  if (value === null) {
    setError(id, 'Введите число, например 1 000 000');
    return null;
  }
  setError(id, '');
  return value;
}

function readInteger(id, { min, max, fallback = null } = {}) {
  const raw = $(id).value.trim();
  if (!raw) {
    if (fallback !== null) {
      setError(id, '');
      return fallback;
    }
    setError(id, 'Заполните поле');
    return null;
  }
  const value = parseMoney(raw);
  if (value === null || !Number.isInteger(value) || value < min || value > max) {
    setError(id, `Введите целое число от ${min} до ${max}`);
    return null;
  }
  setError(id, '');
  return value;
}

function hideResult(id) {
  const container = $(`result-${id}`);
  container.hidden = true;
  container.innerHTML = '';
}

function showResult(id, html) {
  const container = $(`result-${id}`);
  container.innerHTML = html;
  container.hidden = false;
  haptic();
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function haptic() {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
  } catch {
    /* вне Telegram */
  }
}

// --- Обработчики -------------------------------------------------------------

function bindBir() {
  $('form-bir').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    hideResult('bir');
    const days = Number(radioValue('bir-days'));
    const earnings2024 = readMoney('bir-earn2024');
    const earnings2025 = readMoney('bir-earn2025');
    const excludedDays = readInteger('bir-excluded', { min: 0, max: 729, fallback: 0 });

    if ([earnings2024, earnings2025, excludedDays].includes(null)) {
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    const result = calculateBir({
      earnings2024,
      earnings2025,
      days,
      excludedDays,
      tenure6m: radioValue('bir-tenure') === '1',
      district: Number($('bir-district').value),
    });
    showResult('bir', renderBir(result));
  });
}

function updateCareEmployment() {
  const working = radioValue('care-work') === '1';
  $('care-earnings').hidden = !working;
}

function bindCare() {
  document
    .querySelectorAll('input[name="care-work"]')
    .forEach((radio) => radio.addEventListener('change', updateCareEmployment));
  updateCareEmployment();

  $('form-care').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    hideResult('care');
    const working = radioValue('care-work') === '1';
    const children = readInteger('care-children', { min: 1, max: 10, fallback: 1 });
    const district = Number($('care-district').value);

    if (children === null) {
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    let result;
    if (working) {
      const earnings2024 = readMoney('care-earn2024');
      const earnings2025 = readMoney('care-earn2025');
      if ([earnings2024, earnings2025].includes(null)) {
        form.querySelector('.is-invalid')?.focus();
        return;
      }
      result = calculateCareWorking({
        earnings2024,
        earnings2025,
        children,
        district,
      });
    } else {
      result = calculateCareUnemployed({ children, district });
    }

    showResult('care', renderCare(result, working));
  });
}

function bindUnified() {
  $('form-unified').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    hideResult('unified');

    const pmChild = readInteger('uni-pm', {
      min: 3000,
      max: 100000,
      fallback: DATA.PM_CHILD,
    });
    const income12m = readMoney('uni-income');
    const familySize = readInteger('uni-family', { min: 2, max: 15 });
    const children = readInteger('uni-children', { min: 1, max: 10 });

    if ([pmChild, income12m, familySize, children].includes(null)) {
      form.querySelector('.is-invalid')?.focus();
      return;
    }
    if (children >= familySize) {
      setError('uni-children', 'Детей должно быть меньше, чем членов семьи');
      $('uni-children').focus();
      return;
    }

    const result = calculateUnified({
      income12m,
      familySize,
      children,
      pmChild,
      propertyOk: radioValue('uni-property') === '0',
      zeroIncomeOk: radioValue('uni-zero') === '1',
    });
    showResult('unified', renderUnified(result));
  });
}

// --- Навигация ---------------------------------------------------------------

function setView(view, { updateHash = true } = {}) {
  if (!VIEWS.includes(view)) view = 'bir';

  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  document.querySelectorAll('.view').forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });

  if (updateHash) {
    try {
      history.replaceState(null, '', `#${view}`);
    } catch {
      /* file:// */
    }
  }
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  });
}

// --- Telegram ----------------------------------------------------------------

function loadTelegram() {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      resolve(window.Telegram.WebApp);
      return;
    }
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.onload = () => finish(window.Telegram?.WebApp ?? null);
    script.onerror = () => finish(null);
    document.head.appendChild(script);
    setTimeout(() => finish(window.Telegram?.WebApp ?? null), 2500);
  });
}

function applyTheme(tg) {
  const params = tg.themeParams ?? {};
  const mapping = {
    bg_color: '--bg',
    secondary_bg_color: '--surface',
    text_color: '--text',
    hint_color: '--hint',
    button_color: '--accent',
    button_text_color: '--on-accent',
    link_color: '--link',
  };
  for (const [key, cssVar] of Object.entries(mapping)) {
    if (params[key]) {
      document.documentElement.style.setProperty(cssVar, params[key]);
    }
  }
  document.documentElement.dataset.scheme = tg.colorScheme ?? 'light';
}

async function initTelegram() {
  const tg = await loadTelegram();
  if (!tg) return;

  document.documentElement.dataset.tg = '1';
  try {
    tg.ready();
    tg.expand();
  } catch {
    /* старые клиенты */
  }
  applyTheme(tg);
  try {
    tg.onEvent('themeChanged', () => applyTheme(tg));
  } catch {
    /* нет события */
  }
  try {
    tg.setHeaderColor('secondary_bg_color');
  } catch {
    /* необязательно */
  }
}

// --- Запуск ------------------------------------------------------------------

$('screen').innerHTML = [
  birTemplate(),
  careTemplate(),
  unifiedTemplate(),
  birthTemplate(),
  referenceTemplate(),
].join('');

bindBir();
bindCare();
bindUnified();
bindTabs();

setView(location.hash.slice(1) || 'bir', { updateHash: false });
initTelegram();
