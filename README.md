# AURORA — магазин одежды

Сайт магазина одежды Aurora: каталог, корзина, избранное, оформление заказа.

Чистый HTML/CSS/JS — **без сборки и зависимостей**. Деплой на Cloudflare Pages в один шаг.

## Структура

```
├── index.html        # Главная
├── catalog.html      # Каталог с фильтрами
├── about.html        # О бренде
├── contacts.html     # Контакты и FAQ
├── 404.html          # Страница ошибки
├── css/              # Стили
├── js/               # Логика: товары, корзина, каталог
└── assets/           # Графика
```

## Локальный запуск

```bash
npx serve .        # или любой статический сервер
```

## Деплой на Cloudflare Pages

1. GitHub → **New repository** → запушить этот проект.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Выбрать репозиторий. Build command: **пусто**, Output directory: **/**
4. Deploy — готово.

Либо через CLI: `npx wrangler pages deploy .`

---

© 2026 AURORA
