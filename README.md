# PF — Personal Finance Tracker

A personal finance dashboard built with **vanilla HTML, CSS and JavaScript**. No frameworks and no build step. You can track income and spending, see your monthly cash flow, manage bank cards and save toward goals. All data stays in your browser.

## Features

- **Sign-in page** with client-side validation, a show/hide password toggle, "remember me" (`localStorage` vs `sessionStorage`) and a one-click demo login
- **KPI cards**: total balance, monthly income and spending with month-over-month trend, savings rate
- **Cash-flow chart** drawn by hand on `<canvas>`: no chart library, HiDPI-sharp, hover tooltip, redraws on resize via `ResizeObserver`
- **Spending by category** donut built with SVG `stroke-dasharray`
- **Transactions**: add, delete, filter (all / income / expenses), live search (`/` shortcut), grouping by day, pagination, **CSV export**
- **Cards**: 3D flip card, live preview while typing, **Luhn validation**, brand detection. Only the last 4 digits are stored
- **Savings goals** with progress bars. A top-up creates a matching "savings transfer" transaction, so the balance always adds up
- **Monthly budget** tracker and computed **notifications** (budget warnings, reached goals, expiring cards)
- **Settings**: name, currency (KZT / USD / EUR / RUB via `Intl.NumberFormat`), budget, opening balance, reset/clear data
- Hash routing (`#overview`, `#transactions`, …), native `<dialog>` modals, responsive layout with a bottom tab bar on mobile, `prefers-reduced-motion` support, sync across browser tabs

## Tech stack

| Layer | Choice |
| --- | --- |
| Markup | Semantic HTML5, native `<dialog>`, ARIA attributes |
| Styles | CSS custom properties (design tokens), Grid + Flexbox, `color-mix()` |
| Logic | ES2020+ JavaScript, `Intl` API, Canvas 2D, SVG |
| Storage | `localStorage` (versioned key, validated on load) |
| Icons / fonts | Lucide (pinned version), Manrope, Roboto Mono, Isometra |

## Project structure

```
├── index.html        Sign-in page
├── style.css         Sign-in styles
├── script.js         Sign-in logic (validation, session)
├── main.html         Dashboard
├── main_file.css     Dashboard styles
├── dashboard.js      Dashboard logic (state, rendering, chart, forms)
└── Isometra-Regular.ttf
```

## Run locally

```bash
git clone https://github.com/AqLove/Finanse-tracker-.git
cd Finanse-tracker-
```

Open `index.html` in a browser, or use the VS Code **Live Server** extension. Sign in with any email and a password of 6+ characters, or click **Open the demo**.

## How it works

`dashboard.js` uses a simple **one-way data flow**:

```
user action → update state → save() to localStorage → renderAll() → DOM
```

There is a single `state` object (profile, transactions, cards, goals). Every change goes through `commit()`, which saves the state and re-renders, so the UI never gets out of sync with the data. Totals such as balance and monthly spending are **derived** from transactions rather than stored, so there is no second copy of the numbers that could disagree.

## Security notes

- All user text is escaped before it goes into `innerHTML` (protection against XSS)
- Card numbers and CVV codes are never stored. Only `last4`, brand and expiry are kept
- CSV export neutralises cells that start with `= + - @` (protection against CSV/formula injection)
- This is a front-end demo: authentication is simulated, so do not enter real credentials or real card data

## Roadmap

- [ ] Backend with PostgreSQL (users, transactions, categories tables)
- [ ] Real authentication with hashed passwords
- [ ] Recurring transactions and monthly reports
- [ ] Dark theme

## Credits

The layout was inspired by fintech dashboard UI kits. The design, branding and all code are my own.
