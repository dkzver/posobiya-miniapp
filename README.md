# Пособия 2026 — Telegram Mini App

Статический калькулятор пособий РФ: декретные, уход до 1,5 лет, единое пособие,
выплаты при рождении. Работает как Telegram Mini App и как обычный сайт — без бэкенда,
без базы данных и без отправки данных на сервер.

**Демо:** https://dkzver.github.io/posobiya-miniapp/

## Что умеет

| Раздел | Что считает |
|---|---|
| 👶 Декретные | сумму за 140/156/194 дня, средний дневной заработок, минимум и максимум |
| 🍼 До 1,5 лет | 40 % заработка с лимитами, фиксированную сумму для неработающих, нескольких детей |
| 🧮 Единое | право на выплату, размер 50/75/100 %, проверку имущества и нулевого дохода |
| 🎁 Выплаты | единовременное пособие, маткапитал, пособие по уходу |
| 📚 Суммы | МРОТ, ПМ, лимиты 2026 года со ссылками на источники |

## Как открыть в Telegram

Мини-приложение открывается по HTTPS-ссылке. GitHub Pages даёт её автоматически.

### Вариант 1 — кнопка меню (рекомендуется)

1. Откройте [@BotFather](https://t.me/BotFather) → `/mybots` → выберите бота.
2. **Bot Settings** → **Menu Button** → **Edit menu button URL**.
3. Вставьте `https://dkzver.github.io/posobiya-miniapp/`.
4. Название кнопки — например, «Пособия».

Кнопка появится слева от поля ввода в чате с ботом.

### Вариант 2 — кнопка в сообщении

Можно отправлять кнопку с `web_app` через Bot API:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": 123456789,
    "text": "Откройте калькулятор пособий",
    "reply_markup": {
      "inline_keyboard": [[{
        "text": "Рассчитать",
        "web_app": {"url": "https://dkzver.github.io/posobiya-miniapp/"}
      }]]
    }
  }'
```

### Вариант 3 — menu button через API

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Пособия",
      "web_app": {"url": "https://dkzver.github.io/posobiya-miniapp/"}
    }
  }'
```

Mini App требует HTTPS. `file://` и `http://` в Telegram не откроются, для локальной
разработки используйте http-сервер и обычный браузер.

## Локальный запуск

```bash
python -m http.server 8765 --directory site
```

Откройте http://127.0.0.1:8765/. Вне Telegram приложение работает как обычный сайт:
тема берётся из `prefers-color-scheme`, Telegram SDK не обязателен.

## Тесты

```bash
node --test tests/*.test.js
```

34 теста: 25 эталонных расчётов и 9 проверок парсинга, форматирования и границ.

Эталоны в `tests/fixtures.json` генерируются из Python-реализации бота:

```bash
python tools/gen_fixtures.py
```

Так JS и Python считают одинаково — включая округление до копеек.

## Деплой

Сайт лежит в `site/` и не требует сборки. Workflow `.github/workflows/pages.yml`
запускает тесты и публикует `site/` на GitHub Pages при каждом пуше в `main`.

В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.

Адрес будет `https://<username>.github.io/<repo>/`.

### Свой домен

**Settings → Pages → Custom domain**, затем DNS-запись `CNAME` на
`<username>.github.io`. После этого поменяйте URL в BotFather.

## Структура

```
site/
  index.html
  css/styles.css
  js/
    data.js      константы 2026 года и источники
    calc.js      расчёты (порт app/calc.py)
    format.js    форматирование денег и процентов
    ui.js        экраны, формы, Telegram WebApp
  .nojekyll
tests/
  calc.test.js   Node-тесты
  fixtures.json  эталоны из Python
tools/
  gen_fixtures.py
.github/workflows/pages.yml
```

## Обновление сумм

1. Правьте `site/js/data.js` (МРОТ, ПМ, лимиты, маткапитал).
2. Обновите те же значения в Python-проекте бота (`app/data.py`).
3. Перегенерируйте эталоны: `python tools/gen_fixtures.py`.
4. Прогоните `node --test tests/*.test.js`.
5. Закоммитьте и запушьте — Pages обновится автоматически.

## Приватность

- Нет бэкенда, аналитики, cookie и внешних запросов, кроме загрузки Telegram SDK.
- Введённые суммы живут только в памяти вкладки и никуда не отправляются.
- Нет токенов и секретов: репозиторий можно держать публичным.

## Ограничения

- Расчёт предварительный; итоговую сумму определяет СФР или работодатель.
- Региональные доплаты и замена расчётных лет не учитываются.
- Для единого пособия порог дохода проверяется по федеральному ПМ на душу.
- Суммы зафиксированы на 05.11.2026.
