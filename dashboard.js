const STORAGE_KEY = 'pf.dashboard.v1';
const SESSION_KEY = 'pf.session';
const VIEWS = ['overview', 'transactions', 'cards', 'savings', 'settings'];
const OVERVIEW_TX_LIMIT = 6;
const PAGE_SIZE = 25;
const CHART_MONTHS = 6;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORIES = {
    salary: { label: 'Salary', icon: 'briefcase', color: '#1a6e5c', type: 'income' },
    freelance: { label: 'Freelance', icon: 'laptop', color: '#2f9e75', type: 'income' },
    gifts: { label: 'Gifts', icon: 'gift', color: '#6cc24a', type: 'income' },
    food: { label: 'Food & groceries', icon: 'shopping-basket', color: '#e9a23b', type: 'expense' },
    housing: { label: 'Housing', icon: 'house', color: '#114b3e', type: 'expense' },
    transport: { label: 'Transport', icon: 'bus', color: '#4f86e8', type: 'expense' },
    utilities: { label: 'Utilities', icon: 'zap', color: '#8f6fdc', type: 'expense' },
    entertainment: { label: 'Entertainment', icon: 'clapperboard', color: '#e0628a', type: 'expense' },
    shopping: { label: 'Shopping', icon: 'shopping-bag', color: '#c47f3f', type: 'expense' },
    health: { label: 'Health', icon: 'heart-pulse', color: '#e05252', type: 'expense' },
    savings: { label: 'Savings transfer', icon: 'piggy-bank', color: '#8bd96c', type: 'expense', system: true },
    other: { label: 'Other', icon: 'ellipsis', color: '#94a39b', type: 'both' },
};

const CURRENCY_LOCALES = { KZT: 'ru-KZ', USD: 'en-US', EUR: 'de-DE', RUB: 'ru-RU' };

const storage = {
    read(key) {
        try {
            const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            return false;
        }
        return true;
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch {
            return false;
        }
        return true;
    },
};

const pad = (value) => String(value).padStart(2, '0');
const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const parseISODate = (iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[char]));

function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createSeedState(profile = {}) {
    const random = mulberry32(20261020);
    const between = (min, max) => Math.round((min + random() * (max - min)) / 100) * 100;
    const pickOne = (list) => list[Math.floor(random() * list.length)];
    const repeat = (min, max, fn) => {
        const count = min + Math.floor(random() * (max - min + 1));
        for (let i = 0; i < count; i += 1) fn();
    };

    const today = new Date();
    const transactions = [];
    let order = 0;

    for (let offset = CHART_MONTHS - 1; offset >= 0; offset -= 1) {
        const first = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const year = first.getFullYear();
        const month = first.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const lastDay = offset === 0 ? today.getDate() : daysInMonth;
        const anyDay = () => 1 + Math.floor(random() * daysInMonth);

        const add = (day, title, category, amount) => {
            if (day > lastDay) return;
            order += 1;
            transactions.push({
                id: uid(),
                title,
                category,
                type: CATEGORIES[category].type === 'income' ? 'income' : 'expense',
                amount,
                date: toISODate(new Date(year, month, day)),
                createdAt: order,
            });
        };

        add(5, 'Monthly salary', 'salary', 650000);
        if (random() > 0.35) {
            add(12 + Math.floor(random() * 12), pickOne(['Landing page project', 'Website redesign', 'Dashboard UI project', 'Logo & branding']), 'freelance', between(80000, 220000));
        }
        add(1, 'Apartment rent', 'housing', 180000);
        add(6, 'Transfer to Emergency fund', 'savings', 50000);
        add(9, 'Electricity & internet', 'utilities', between(18000, 26000));
        add(14, 'Mobile plan', 'utilities', 4500);
        repeat(5, 8, () => add(anyDay(), pickOne(['Supermarket', 'Corner grocery', 'Coffee shop', 'Bakery', 'Farmers market', 'Team lunch', 'Pizza night']), 'food', between(4000, 26000)));
        repeat(3, 5, () => add(anyDay(), pickOne(['Taxi ride', 'Bus card top-up', 'Fuel']), 'transport', between(1200, 7000)));
        repeat(1, 3, () => add(anyDay(), pickOne(['Cinema tickets', 'Music subscription', 'Video game', 'Concert']), 'entertainment', between(3000, 18000)));
        repeat(0, 2, () => add(anyDay(), pickOne(['Clothing store', 'Online order', 'Home goods']), 'shopping', between(9000, 60000)));
        if (random() > 0.5) add(anyDay(), pickOne(['Pharmacy', 'Dentist check-up']), 'health', between(3000, 15000));
    }

    const name = profile.name || 'Guest';
    const expiryYear = pad((today.getFullYear() + 3) % 100);

    return {
        version: 1,
        profile: {
            name,
            email: profile.email || '',
            currency: 'KZT',
            monthlyBudget: 450000,
            openingBalance: 420000,
        },
        transactions,
        cards: [
            { id: uid(), holder: name.toUpperCase(), last4: '6576', brand: 'mastercard', expiry: `12/${expiryYear}`, theme: 'forest' },
            { id: uid(), holder: name.toUpperCase(), last4: '4242', brand: 'visa', expiry: `08/${pad((today.getFullYear() + 2) % 100)}`, theme: 'night' },
        ],
        activeCardId: null,
        goals: [
            { id: uid(), name: 'Emergency fund', icon: 'shield', target: 1500000, saved: 640000 },
            { id: uid(), name: 'New laptop', icon: 'laptop', target: 900000, saved: 310000 },
            { id: uid(), name: 'Summer trip', icon: 'plane', target: 400000, saved: 365000 },
        ],
        seenNotifications: '',
    };
}

function isValidTransaction(tx) {
    return tx
        && typeof tx.title === 'string'
        && Number.isFinite(tx.amount)
        && tx.amount > 0
        && (tx.type === 'income' || tx.type === 'expense')
        && ISO_DATE.test(tx.date);
}

function loadState() {
    const stored = storage.read(STORAGE_KEY);
    if (!stored || !Array.isArray(stored.transactions)) return createSeedState(storage.read(SESSION_KEY) ?? {});
    const seed = createSeedState();
    return {
        ...seed,
        ...stored,
        profile: { ...seed.profile, ...stored.profile },
        transactions: stored.transactions.filter(isValidTransaction),
        cards: Array.isArray(stored.cards) ? stored.cards : [],
        goals: Array.isArray(stored.goals) ? stored.goals : [],
    };
}

function applySession() {
    const session = storage.read(SESSION_KEY);
    if (!session?.email || session.email === state.profile.email) return;
    state.profile.email = session.email;
    state.profile.name = session.name || state.profile.name;
}

let state = loadState();
applySession();

const ui = { view: 'overview', filter: 'all', query: '', hoverMonth: -1, pageLimit: PAGE_SIZE };
const chart = { groups: [], data: [] };
let moneyFormatter;
let compactFormatter;
let toastTimer;

const $ = (id) => document.getElementById(id);
const els = {
    greeting: $('greeting'),
    todayLabel: $('today-label'),
    profileName: $('profile-name'),
    profileAvatar: $('profile-avatar'),
    profileBtn: $('profile-btn'),
    profileMenu: $('profile-menu'),
    notifBtn: $('notif-btn'),
    notifMenu: $('notif-menu'),
    notifList: $('notif-list'),
    notifBadge: $('notif-badge'),
    search: $('search-input'),
    budgetPercent: $('budget-percent'),
    budgetProgress: $('budget-progress'),
    budgetBar: $('budget-bar'),
    budgetNote: $('budget-note'),
    kpiBalance: $('kpi-balance'),
    kpiBalanceSub: $('kpi-balance-sub'),
    kpiIncome: $('kpi-income'),
    kpiIncomeSub: $('kpi-income-sub'),
    kpiSpending: $('kpi-spending'),
    kpiSpendingSub: $('kpi-spending-sub'),
    kpiRate: $('kpi-rate'),
    kpiRateSub: $('kpi-rate-sub'),
    chartBox: $('chart-box'),
    chart: $('cashflow-chart'),
    tooltip: $('chart-tooltip'),
    activeCard: $('active-card'),
    cardList: $('card-list'),
    cardsSub: $('cards-sub'),
    txTitle: $('tx-title'),
    txSub: $('tx-sub'),
    txList: $('tx-list'),
    txFilter: $('tx-filter'),
    txSeeAll: $('tx-see-all'),
    txMore: $('tx-more'),
    donut: $('donut'),
    donutTotal: $('donut-total'),
    catList: $('cat-list'),
    goalList: $('goal-list'),
    goalsSub: $('goals-sub'),
    settingsForm: $('settings-form'),
    txForm: $('tx-form'),
    cardForm: $('card-form'),
    cardPreview: $('card-preview'),
    goalForm: $('goal-form'),
    depositForm: $('deposit-form'),
    toast: $('toast'),
};

function setupFormatters() {
    const { currency } = state.profile;
    const fractionDigits = currency === 'USD' || currency === 'EUR' ? 2 : 0;
    moneyFormatter = new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
    });
    compactFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
}

const money = (value) => moneyFormatter.format(value);
const compact = (value) => compactFormatter.format(value);
const signedMoney = (tx) => `${tx.type === 'income' ? '+' : '−'}${money(tx.amount)}`;
const categoryOf = (tx) => CATEGORIES[tx.category] ?? CATEGORIES.other;
const isSpending = (tx) => tx.type === 'expense' && tx.category !== 'savings';
const shortDate = (iso) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function save() {
    storage.write(STORAGE_KEY, state);
}

function commit(message) {
    save();
    renderAll();
    if (message) toast(message);
}

function balance() {
    return state.transactions.reduce(
        (sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount),
        Number(state.profile.openingBalance) || 0,
    );
}

function totalsForMonth(key) {
    return state.transactions.reduce((acc, tx) => {
        if (!tx.date.startsWith(key)) return acc;
        if (tx.type === 'income') acc.income += tx.amount;
        else if (isSpending(tx)) acc.spending += tx.amount;
        else acc.saved += tx.amount;
        return acc;
    }, { income: 0, spending: 0, saved: 0 });
}

function lastMonths(count) {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
        const key = monthKey(date);
        return {
            key,
            label: date.toLocaleString('en', { month: 'short' }),
            fullLabel: date.toLocaleString('en', { month: 'long', year: 'numeric' }),
            ...totalsForMonth(key),
        };
    });
}

function trendBadge(current, previous, higherIsGood) {
    if (!previous) return '<span class="trend flat">new</span>';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 0.5) return '<span class="trend flat">0%</span>';
    const up = change > 0;
    const tone = up === higherIsGood ? 'good' : 'bad';
    return `<span class="trend ${tone}"><i data-lucide="${up ? 'trending-up' : 'trending-down'}"></i>${Math.abs(change).toFixed(1)}%</span>`;
}

function renderProfile() {
    const hour = new Date().getHours();
    const part = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = state.profile.name.split(' ')[0];
    const initials = state.profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('');

    els.greeting.textContent = `${part}, ${firstName}`;
    els.todayLabel.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    els.profileName.textContent = state.profile.name;
    els.profileAvatar.textContent = initials || 'PF';
}

function renderKpis() {
    const [previous, current] = lastMonths(2);
    const inGoals = state.goals.reduce((sum, goal) => sum + goal.saved, 0);
    const rate = current.income ? Math.round(((current.income - current.spending) / current.income) * 100) : 0;
    const previousRate = previous.income ? Math.round(((previous.income - previous.spending) / previous.income) * 100) : 0;
    const rateDelta = rate - previousRate;

    els.kpiBalance.textContent = money(balance());
    els.kpiBalanceSub.textContent = `${money(inGoals)} set aside in goals`;
    els.kpiIncome.textContent = money(current.income);
    els.kpiIncomeSub.innerHTML = `${trendBadge(current.income, previous.income, true)} vs last month`;
    els.kpiSpending.textContent = money(current.spending);
    els.kpiSpendingSub.innerHTML = `${trendBadge(current.spending, previous.spending, false)} vs last month`;
    els.kpiRate.textContent = `${rate}%`;
    els.kpiRateSub.innerHTML = previous.income
        ? `<span class="trend ${rateDelta >= 0 ? 'good' : 'bad'}">${rateDelta >= 0 ? '+' : ''}${rateDelta} pt</span> of income kept`
        : 'of income kept this month';
}

function renderBudget() {
    const budget = Number(state.profile.monthlyBudget) || 0;
    const { spending } = totalsForMonth(monthKey(new Date()));
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

    if (!budget) {
        els.budgetPercent.textContent = '—';
        els.budgetBar.style.width = '0%';
        els.budgetNote.textContent = 'Set a budget in Settings';
        return;
    }

    const percent = Math.round((spending / budget) * 100);
    els.budgetPercent.textContent = `${percent}%`;
    els.budgetBar.style.width = `${Math.min(percent, 100)}%`;
    els.budgetProgress.classList.toggle('is-warn', percent >= 80 && percent < 100);
    els.budgetProgress.classList.toggle('is-over', percent >= 100);
    els.budgetNote.textContent = spending > budget
        ? `Over by ${money(spending - budget)}`
        : `${money(budget - spending)} left · ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`;
}

function filteredTransactions() {
    const query = ui.query.trim().toLowerCase();
    return state.transactions
        .filter((tx) => ui.filter === 'all' || tx.type === ui.filter)
        .filter((tx) => !query || tx.title.toLowerCase().includes(query) || categoryOf(tx).label.toLowerCase().includes(query))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function dayLabel(iso) {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (iso === toISODate(today)) return 'Today';
    if (iso === toISODate(yesterday)) return 'Yesterday';
    return parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function transactionRow(tx) {
    const category = categoryOf(tx);
    return `
        <li class="tx">
            <span class="tx_icon" style="--c:${category.color}"><i data-lucide="${category.icon}"></i></span>
            <div>
                <p class="tx_title">${escapeHTML(tx.title)}</p>
                <p class="tx_meta">${category.label}</p>
            </div>
            <span class="tx_amount ${tx.type === 'income' ? 'is-income' : ''}">${signedMoney(tx)}</span>
            <button type="button" class="icon_btn sm danger" data-action="delete-tx" data-id="${tx.id}" aria-label="Delete ${escapeHTML(tx.title)}"><i data-lucide="trash-2"></i></button>
        </li>`;
}

function renderTransactions() {
    const all = filteredTransactions();
    const isOverview = ui.view === 'overview';
    const limit = isOverview && !ui.query ? OVERVIEW_TX_LIMIT : ui.pageLimit;
    const limited = all.slice(0, limit);

    els.txTitle.textContent = isOverview ? 'Recent transactions' : 'All transactions';
    els.txSub.textContent = ui.query
        ? `${all.length} result${all.length === 1 ? '' : 's'} for “${ui.query.trim()}”`
        : `${all.length} transaction${all.length === 1 ? '' : 's'}${limited.length < all.length ? ` · showing latest ${limited.length}` : ''}`;
    els.txSeeAll.hidden = !isOverview || limited.length === all.length;
    els.txMore.hidden = isOverview || limited.length === all.length;
    els.txMore.textContent = `Show ${Math.min(PAGE_SIZE, all.length - limited.length)} more`;

    if (!limited.length) {
        els.txList.innerHTML = `
            <div class="empty">
                <i data-lucide="${ui.query ? 'search-x' : 'receipt'}"></i>
                <p>${ui.query ? 'Nothing matches your search.' : 'No transactions yet.'}</p>
                ${ui.query ? '' : '<button type="button" class="link_btn" data-open="tx-dialog"><i data-lucide="plus"></i>Add the first one</button>'}
            </div>`;
        return;
    }

    const groups = limited.reduce((map, tx) => {
        if (!map.has(tx.date)) map.set(tx.date, []);
        map.get(tx.date).push(tx);
        return map;
    }, new Map());

    els.txList.innerHTML = [...groups].map(([date, items]) => `
        <div class="tx_group">
            <p class="tx_day">${dayLabel(date)}</p>
            <ul>${items.map(transactionRow).join('')}</ul>
        </div>`).join('');
}

function renderCategories() {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const sinceISO = toISODate(since);

    const totals = new Map();
    state.transactions
        .filter((tx) => isSpending(tx) && tx.date >= sinceISO)
        .forEach((tx) => totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount));

    const rows = [...totals].map(([key, amount]) => ({ key, amount, ...(CATEGORIES[key] ?? CATEGORIES.other) })).sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    els.donutTotal.textContent = money(total);

    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = rows.map((row) => {
        const length = (row.amount / total) * circumference;
        const visible = Math.max(length - (rows.length > 1 ? 1.5 : 0), 0.01);
        const segment = `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${row.color}" stroke-width="14" stroke-dasharray="${visible} ${circumference - visible}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"></circle>`;
        offset += length;
        return segment;
    });
    els.donut.innerHTML = `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--grid)" stroke-width="14"></circle>${segments.join('')}`;

    els.catList.innerHTML = rows.length
        ? rows.slice(0, 6).map((row) => `
            <li class="cat" style="--c:${row.color}">
                <span class="cat_dot"></span>
                <span class="cat_name">${row.label}</span>
                <span class="cat_pct">${Math.round((row.amount / total) * 100)}%</span>
                <span class="cat_amt">${money(row.amount)}</span>
            </li>`).join('')
        : '<li class="empty"><i data-lucide="chart-pie"></i><p>No spending in the last 30 days.</p></li>';
}

function brandLabel(brand) {
    return { visa: 'VISA', mastercard: 'MASTERCARD', amex: 'AMEX', mir: 'MIR' }[brand] ?? 'CARD';
}

function detectBrand(digits) {
    if (/^4/.test(digits)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    if (/^220[0-4]/.test(digits)) return 'mir';
    return 'card';
}

const contactlessIcon = '<svg class="bc_wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8.5 7.5a6 6 0 0 1 0 9"/><path d="M12 5a10 10 0 0 1 0 14"/><path d="M15.5 2.5a14 14 0 0 1 0 19"/></svg>';

function cardMarkup({ holder, number, expiry, brand, theme, cvv = '•••' }) {
    return `
        <div class="bank_card theme_${theme}" data-action="flip-card" role="button" tabindex="0" aria-label="Bank card, press to flip">
            <div class="bank_card_inner">
                <div class="bank_card_face bank_card_front">
                    <div class="bc_top">
                        <span class="bc_bank">PF</span>
                        <span class="bc_brand" data-field="brand">${brandLabel(brand)}</span>
                    </div>
                    <div class="bc_mid"><span class="bc_chip"></span>${contactlessIcon}</div>
                    <p class="bc_number" data-field="number">${escapeHTML(number)}</p>
                    <div class="bc_bottom">
                        <div><span class="bc_label">Card holder</span><span class="bc_value" data-field="holder">${escapeHTML(holder)}</span></div>
                        <div><span class="bc_label">Expires</span><span class="bc_value" data-field="expiry">${escapeHTML(expiry)}</span></div>
                    </div>
                </div>
                <div class="bank_card_face bank_card_back">
                    <div class="bc_strip"></div>
                    <div class="bc_sign"><span data-field="cvv">${escapeHTML(cvv)}</span></div>
                    <p class="bc_back_note">Demo card for a portfolio project. Not a real payment method.</p>
                </div>
            </div>
        </div>`;
}

function renderCards() {
    const active = state.cards.find((card) => card.id === state.activeCardId) ?? state.cards[0];
    els.cardsSub.textContent = state.cards.length
        ? `${state.cards.length} card${state.cards.length === 1 ? '' : 's'} linked`
        : 'No cards yet';

    if (!active) {
        els.activeCard.innerHTML = `
            <div class="empty">
                <i data-lucide="credit-card"></i>
                <p>Add a card to see it here.</p>
                <button type="button" class="link_btn" data-open="card-dialog"><i data-lucide="plus"></i>Add card</button>
            </div>`;
        els.cardList.innerHTML = '';
        return;
    }

    els.activeCard.innerHTML = `${cardMarkup({ ...active, number: `•••• •••• •••• ${active.last4}` })}<p class="card_hint">Click the card to flip it</p>`;
    els.cardList.innerHTML = state.cards.map((card) => `
        <li class="card_row ${card.id === active.id ? 'active' : ''}">
            <button type="button" class="card_select" data-action="select-card" data-id="${card.id}" aria-pressed="${card.id === active.id}">
                <span class="swatch theme_${card.theme}"></span>
                <span>
                    <span class="card_row_title">${brandLabel(card.brand)} •••• ${escapeHTML(card.last4)}</span>
                    <span class="card_row_meta">${escapeHTML(card.holder)} · ${escapeHTML(card.expiry)}</span>
                </span>
            </button>
            <button type="button" class="icon_btn sm danger" data-action="delete-card" data-id="${card.id}" aria-label="Remove card ending ${escapeHTML(card.last4)}"><i data-lucide="trash-2"></i></button>
        </li>`).join('');
}

function renderGoals() {
    const saved = state.goals.reduce((sum, goal) => sum + goal.saved, 0);
    const target = state.goals.reduce((sum, goal) => sum + goal.target, 0);
    els.goalsSub.textContent = state.goals.length ? `${money(saved)} of ${money(target)}` : 'Create a goal to start saving';

    if (!state.goals.length) {
        els.goalList.innerHTML = '<li class="empty"><i data-lucide="target"></i><p>No goals yet.</p></li>';
        return;
    }

    els.goalList.innerHTML = state.goals.map((goal) => {
        const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
        const done = goal.saved >= goal.target;
        return `
            <li class="goal ${done ? 'done' : ''}">
                <span class="goal_icon"><i data-lucide="${done ? 'check' : escapeHTML(goal.icon || 'target')}"></i></span>
                <div class="goal_body">
                    <div class="goal_row"><p class="goal_name">${escapeHTML(goal.name)}</p><p class="goal_pct">${percent}%</p></div>
                    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${escapeHTML(goal.name)} progress"><span style="width:${percent}%"></span></div>
                    <div class="goal_row goal_meta"><span>${money(goal.saved)}</span><span>${done ? 'Reached' : `of ${money(goal.target)}`}</span></div>
                </div>
                <div class="goal_actions">
                    ${done ? '' : `<button type="button" class="icon_btn sm" data-open="deposit-dialog" data-id="${goal.id}" aria-label="Add money to ${escapeHTML(goal.name)}"><i data-lucide="plus"></i></button>`}
                    <button type="button" class="icon_btn sm danger" data-action="delete-goal" data-id="${goal.id}" aria-label="Delete ${escapeHTML(goal.name)}"><i data-lucide="trash-2"></i></button>
                </div>
            </li>`;
    }).join('');
}

function buildNotifications() {
    const list = [];
    const key = monthKey(new Date());
    const budget = Number(state.profile.monthlyBudget) || 0;
    const { spending } = totalsForMonth(key);

    if (budget) {
        const percent = (spending / budget) * 100;
        if (percent >= 100) {
            list.push({ tone: 'danger', icon: 'triangle-alert', title: 'Budget exceeded', text: `You are ${money(spending - budget)} over this month's budget.` });
        } else if (percent >= 80) {
            list.push({ tone: 'warn', icon: 'gauge', title: 'Budget almost used', text: `${Math.round(percent)}% of your monthly budget is spent.` });
        }
    }

    state.goals.filter((goal) => goal.saved >= goal.target).forEach((goal) => {
        list.push({ tone: 'ok', icon: 'party-popper', title: `Goal reached: ${goal.name}`, text: 'Nice work. Time to set a new target.' });
    });

    const now = new Date();
    state.cards.forEach((card) => {
        const [month, year] = card.expiry.split('/').map(Number);
        const expiresAt = new Date(2000 + year, month, 1);
        const days = (expiresAt - now) / 86400000;
        if (days > 0 && days < 62) {
            list.push({ tone: 'warn', icon: 'credit-card', title: 'Card expires soon', text: `${brandLabel(card.brand)} •••• ${card.last4} expires ${card.expiry}.` });
        }
    });

    const salary = state.transactions.find((tx) => tx.category === 'salary' && tx.date.startsWith(key));
    if (salary) list.push({ tone: 'ok', icon: 'banknote', title: 'Salary received', text: `${money(salary.amount)} on ${shortDate(salary.date)}.` });

    return list;
}

function renderNotifications() {
    const list = buildNotifications();
    const signature = list.map((item) => item.title).join('|');
    els.notifBadge.hidden = !list.length || signature === state.seenNotifications;
    els.notifList.innerHTML = list.length
        ? list.map((item) => `
            <li class="notif ${item.tone}">
                <span class="notif_icon"><i data-lucide="${item.icon}"></i></span>
                <div><p class="notif_title">${escapeHTML(item.title)}</p><p class="notif_text">${escapeHTML(item.text)}</p></div>
            </li>`).join('')
        : '<li class="notif_empty">You are all caught up.</li>';
    return signature;
}

function renderSettings() {
    const { elements } = els.settingsForm;
    elements.name.value = state.profile.name;
    elements.currency.value = state.profile.currency;
    elements.monthlyBudget.value = state.profile.monthlyBudget;
    elements.openingBalance.value = state.profile.openingBalance;
}

function niceStep(raw) {
    if (raw <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / power;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return nice * power;
}

function roundedRect(ctx, x, y, width, height, top, bottom = top) {
    const r1 = Math.min(top, width / 2, height / 2);
    const r2 = Math.min(bottom, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r1, y);
    ctx.lineTo(x + width - r1, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r1);
    ctx.lineTo(x + width, y + height - r2);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r2, y + height);
    ctx.lineTo(x + r2, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r2);
    ctx.lineTo(x, y + r1);
    ctx.quadraticCurveTo(x, y, x + r1, y);
    ctx.closePath();
}

function drawChart() {
    const width = els.chartBox.clientWidth;
    const height = els.chartBox.clientHeight;
    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    els.chart.width = Math.round(width * dpr);
    els.chart.height = Math.round(height * dpr);
    els.chart.style.width = `${width}px`;
    els.chart.style.height = `${height}px`;

    const ctx = els.chart.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const css = getComputedStyle(document.documentElement);
    const token = (name) => css.getPropertyValue(name).trim();
    const data = lastMonths(CHART_MONTHS);
    chart.data = data;

    const padding = { top: 12, right: 6, bottom: 30, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const peak = Math.max(1, ...data.flatMap((month) => [month.income, month.spending]));
    const step = niceStep(peak / 4);
    const max = step * 4;

    ctx.font = '500 11px "Roboto Mono", monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i += 1) {
        const y = Math.round(padding.top + plotHeight - (plotHeight * i) / 4) + 0.5;
        ctx.strokeStyle = token('--grid');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillStyle = token('--subtle');
        ctx.textAlign = 'right';
        ctx.fillText(compact(step * i), padding.left - 10, y);
    }

    const groupWidth = plotWidth / data.length;
    const barWidth = Math.max(6, Math.min(22, groupWidth * 0.26));
    const gap = Math.max(3, barWidth * 0.25);

    const drawBar = (x, value, color) => {
        const barHeight = (value / max) * plotHeight;
        if (barHeight <= 0) return;
        ctx.fillStyle = color;
        roundedRect(ctx, x, padding.top + plotHeight - barHeight, barWidth, barHeight, 6, 0);
        ctx.fill();
    };

    chart.groups = data.map((month, index) => {
        const x0 = padding.left + groupWidth * index;
        const center = x0 + groupWidth / 2;

        if (index === ui.hoverMonth) {
            ctx.fillStyle = token('--hover');
            roundedRect(ctx, x0 + 4, padding.top - 4, groupWidth - 8, plotHeight + 4, 10);
            ctx.fill();
        }

        drawBar(center - gap / 2 - barWidth, month.income, token('--income'));
        drawBar(center + gap / 2, month.spending, token('--expense'));

        ctx.textAlign = 'center';
        ctx.fillStyle = index === data.length - 1 ? token('--text') : token('--muted');
        ctx.font = `${index === data.length - 1 ? 700 : 500} 12px Manrope, system-ui, sans-serif`;
        ctx.fillText(month.label, center, height - padding.bottom / 2 + 2);
        ctx.font = '500 11px "Roboto Mono", monospace';

        return { x0, x1: x0 + groupWidth, center };
    });
}

function showTooltip(index) {
    const month = chart.data[index];
    const group = chart.groups[index];
    if (!month || !group) {
        els.tooltip.hidden = true;
        return;
    }
    const net = month.income - month.spending;
    els.tooltip.innerHTML = `
        <strong>${month.fullLabel}</strong>
        <div class="tt_row"><span><i class="dot dot_income"></i>Income</span><span>${money(month.income)}</span></div>
        <div class="tt_row"><span><i class="dot dot_expense"></i>Spending</span><span>${money(month.spending)}</span></div>
        <div class="tt_row tt_net"><span>Net</span><span>${net >= 0 ? '+' : '−'}${money(Math.abs(net))}</span></div>`;
    els.tooltip.hidden = false;
    const half = els.tooltip.offsetWidth / 2;
    const left = Math.min(Math.max(group.center, half), els.chartBox.clientWidth - half);
    els.tooltip.style.left = `${left}px`;
}

function handleChartPointer(event) {
    const rect = els.chart.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const index = chart.groups.findIndex((group) => x >= group.x0 && x < group.x1);
    if (index === ui.hoverMonth) return;
    ui.hoverMonth = index;
    drawChart();
    showTooltip(index);
}

function clearChartHover() {
    ui.hoverMonth = -1;
    els.tooltip.hidden = true;
    drawChart();
}

function icons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });
}

function renderAll() {
    setupFormatters();
    renderProfile();
    renderKpis();
    renderBudget();
    renderTransactions();
    renderCategories();
    renderCards();
    renderGoals();
    renderNotifications();
    if (ui.view === 'settings') renderSettings();
    drawChart();
    icons();
}

function applyView() {
    const requested = window.location.hash.slice(1);
    ui.view = VIEWS.includes(requested) ? requested : 'overview';
    document.body.dataset.view = ui.view;

    document.querySelectorAll('[data-views]').forEach((element) => {
        element.hidden = !element.dataset.views.split(' ').includes(ui.view);
    });
    document.querySelectorAll('[data-view-link]').forEach((link) => {
        const active = link.dataset.viewLink === ui.view;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

    if (ui.view === 'settings') renderSettings();
    ui.pageLimit = PAGE_SIZE;
    closeMenus();
    renderTransactions();
    icons();
    window.scrollTo({ top: 0 });
}

function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

function clearErrors(form) {
    form.querySelector('[data-error]').textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
}

function fail(form, fieldName, message) {
    clearErrors(form);
    const field = form.elements[fieldName];
    form.querySelector('[data-error]').textContent = message;
    if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
    }
    return false;
}

function fillCategoryOptions(type) {
    const select = els.txForm.elements.category;
    select.innerHTML = Object.entries(CATEGORIES)
        .filter(([, category]) => !category.system && (category.type === type || category.type === 'both'))
        .map(([key, category]) => `<option value="${key}">${category.label}</option>`)
        .join('');
}

function formatCardNumber(value) {
    return value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function luhnValid(digits) {
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let digit = Number(digits[i]);
        if (double) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        double = !double;
    }
    return sum % 10 === 0;
}

function syncCardPreview() {
    const { elements } = els.cardForm;
    const digits = elements.number.value.replace(/\D/g, '');
    const padded = digits.padEnd(16, '•').slice(0, Math.max(16, digits.length));
    const card = els.cardPreview.querySelector('.bank_card');
    if (!card) return;

    card.className = `bank_card theme_${elements.theme.value}${card.classList.contains('is-flipped') ? ' is-flipped' : ''}`;
    card.querySelector('[data-field="number"]').textContent = padded.replace(/(.{4})(?=.)/g, '$1 ');
    card.querySelector('[data-field="holder"]').textContent = elements.holder.value.trim().toUpperCase() || 'YOUR NAME';
    card.querySelector('[data-field="expiry"]').textContent = elements.expiry.value || 'MM/YY';
    card.querySelector('[data-field="brand"]').textContent = brandLabel(detectBrand(digits));
    card.querySelector('[data-field="cvv"]').textContent = '•'.repeat(elements.cvv.value.length) || '•••';
}

function openDialog(id, trigger) {
    const dialog = $(id);
    if (!dialog) return;
    const form = dialog.querySelector('form');
    form.reset();
    clearErrors(form);

    if (id === 'tx-dialog') {
        const today = toISODate(new Date());
        form.elements.date.value = today;
        form.elements.date.max = today;
        fillCategoryOptions('expense');
    }

    if (id === 'card-dialog') {
        els.cardPreview.innerHTML = cardMarkup({ holder: 'YOUR NAME', number: '', expiry: 'MM/YY', brand: 'card', theme: 'forest' });
        form.elements.holder.value = state.profile.name.toUpperCase();
        syncCardPreview();
    }

    if (id === 'deposit-dialog') {
        const goal = state.goals.find((item) => item.id === trigger?.dataset.id);
        if (!goal) return;
        form.elements.goalId.value = goal.id;
        dialog.querySelector('[data-goal-name]').textContent = goal.name;
        dialog.querySelector('[data-goal-hint]').textContent = `${money(goal.target - goal.saved)} left to reach the goal · available ${money(balance())}`;
    }

    dialog.showModal();
    icons();
    dialog.querySelector('input:not([type="hidden"]):not([type="radio"]), select')?.focus();
}

function closeMenus() {
    [[els.notifBtn, els.notifMenu], [els.profileBtn, els.profileMenu]].forEach(([button, menu]) => {
        menu.hidden = true;
        button.setAttribute('aria-expanded', 'false');
    });
}

function toggleMenu(button, menu) {
    const willOpen = menu.hidden;
    closeMenus();
    if (!willOpen) return;
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (menu === els.notifMenu) {
        state.seenNotifications = renderNotifications();
        els.notifBadge.hidden = true;
        save();
        icons();
    }
}

function csvCell(value) {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv() {
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency']];
    filteredTransactions().forEach((tx) => {
        rows.push([tx.date, tx.title, categoryOf(tx).label, tx.type, tx.type === 'income' ? tx.amount : -tx.amount, state.profile.currency]);
    });
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `transactions-${toISODate(new Date())}.csv` });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length - 1} transactions`);
}

function handleAction(action, id, element) {
    if (action === 'flip-card') {
        element.classList.toggle('is-flipped');
        return;
    }

    if (action === 'delete-tx') {
        const tx = state.transactions.find((item) => item.id === id);
        state.transactions = state.transactions.filter((item) => item.id !== id);
        commit(tx ? `Deleted “${tx.title}”` : '');
        return;
    }

    if (action === 'select-card') {
        state.activeCardId = id;
        commit();
        return;
    }

    if (action === 'delete-card') {
        const card = state.cards.find((item) => item.id === id);
        if (!card || !window.confirm(`Remove card ending ${card.last4}?`)) return;
        state.cards = state.cards.filter((item) => item.id !== id);
        if (state.activeCardId === id) state.activeCardId = null;
        commit('Card removed');
        return;
    }

    if (action === 'delete-goal') {
        const goal = state.goals.find((item) => item.id === id);
        if (!goal || !window.confirm(`Delete goal “${goal.name}”?`)) return;
        state.goals = state.goals.filter((item) => item.id !== id);
        commit('Goal deleted');
    }
}

function handleTransactionSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const title = data.title.trim();
    const amount = Number(data.amount);

    if (!title) return fail(form, 'title', 'Add a short description.');
    if (!Number.isFinite(amount) || amount <= 0) return fail(form, 'amount', 'Amount must be greater than zero.');
    if (!ISO_DATE.test(data.date) || data.date > toISODate(new Date())) return fail(form, 'date', 'Pick today or a date in the past.');

    state.transactions.push({
        id: uid(),
        title,
        amount: Math.round(amount * 100) / 100,
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: Date.now(),
    });
    form.closest('dialog').close();
    commit(`${data.type === 'income' ? 'Income' : 'Expense'} added`);
    return true;
}

function handleCardSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const holder = data.holder.trim().replace(/\s+/g, ' ');
    const digits = data.number.replace(/\D/g, '');
    const expiryMatch = data.expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);

    if (!/^[\p{L} .'-]{2,26}$/u.test(holder)) return fail(form, 'holder', 'Use letters only, 2–26 characters.');
    if (digits.length < 13 || !luhnValid(digits)) return fail(form, 'number', 'This card number is not valid. Try 4242 4242 4242 4242.');
    if (!expiryMatch) return fail(form, 'expiry', 'Use the MM/YY format.');

    const expiresAt = new Date(2000 + Number(expiryMatch[2]), Number(expiryMatch[1]), 1);
    if (expiresAt <= new Date()) return fail(form, 'expiry', 'This card has already expired.');
    if (!/^\d{3,4}$/.test(data.cvv)) return fail(form, 'cvv', 'CVV is 3 or 4 digits.');

    const card = {
        id: uid(),
        holder: holder.toUpperCase(),
        last4: digits.slice(-4),
        brand: detectBrand(digits),
        expiry: data.expiry,
        theme: data.theme,
    };
    state.cards.push(card);
    state.activeCardId = card.id;
    form.closest('dialog').close();
    commit('Card saved. Only the last 4 digits are stored.');
    return true;
}

function handleGoalSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const name = data.name.trim();
    const target = Number(data.target);
    const saved = Number(data.saved || 0);

    if (!name) return fail(form, 'name', 'Give your goal a name.');
    if (!Number.isFinite(target) || target <= 0) return fail(form, 'target', 'Target must be greater than zero.');
    if (!Number.isFinite(saved) || saved < 0) return fail(form, 'saved', 'Saved amount cannot be negative.');

    state.goals.push({ id: uid(), name, icon: 'target', target, saved: Math.min(saved, target) });
    form.closest('dialog').close();
    commit('Goal created');
    return true;
}

function handleDepositSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const goal = state.goals.find((item) => item.id === data.goalId);
    const amount = Number(data.amount);

    if (!goal) return fail(form, 'amount', 'This goal no longer exists.');
    if (!Number.isFinite(amount) || amount <= 0) return fail(form, 'amount', 'Amount must be greater than zero.');
    if (amount > balance()) return fail(form, 'amount', `Not enough balance. Available: ${money(balance())}.`);

    goal.saved += amount;
    state.transactions.push({
        id: uid(),
        title: `Transfer to ${goal.name}`,
        amount,
        type: 'expense',
        category: 'savings',
        date: toISODate(new Date()),
        createdAt: Date.now(),
    });
    form.closest('dialog').close();
    commit(`${money(amount)} added to ${goal.name}`);
    return true;
}

function handleSettingsSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const name = data.name.trim();
    const monthlyBudget = Number(data.monthlyBudget || 0);
    const openingBalance = Number(data.openingBalance || 0);

    if (name.length < 2) return fail(form, 'name', 'Name should be at least 2 characters.');
    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) return fail(form, 'monthlyBudget', 'Budget cannot be negative.');
    if (!Number.isFinite(openingBalance)) return fail(form, 'openingBalance', 'Enter a valid number.');

    clearErrors(form);
    state.profile = { ...state.profile, name, currency: data.currency, monthlyBudget, openingBalance };
    commit('Settings saved');
    return true;
}

function bindEvents() {
    document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-open]');
        if (opener) {
            openDialog(opener.dataset.open, opener);
            return;
        }
        const closer = event.target.closest('[data-close]');
        if (closer) {
            closer.closest('dialog')?.close();
            return;
        }
        const actionElement = event.target.closest('[data-action]');
        if (actionElement) {
            handleAction(actionElement.dataset.action, actionElement.dataset.id, actionElement);
            return;
        }
        if (!event.target.closest('.dropdown')) closeMenus();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenus();
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
        if (event.key === '/' && !isTyping && !document.querySelector('dialog[open]')) {
            event.preventDefault();
            els.search.focus();
        }
        const card = event.target.closest?.('[data-action="flip-card"]');
        if (card && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            card.classList.toggle('is-flipped');
        }
    });

    document.querySelectorAll('dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) dialog.close();
        });
    });

    els.notifBtn.addEventListener('click', () => toggleMenu(els.notifBtn, els.notifMenu));
    els.profileBtn.addEventListener('click', () => toggleMenu(els.profileBtn, els.profileMenu));

    $('logout-btn').addEventListener('click', () => {
        storage.remove(SESSION_KEY);
        window.location.href = 'index.html';
    });

    els.search.addEventListener('input', () => {
        ui.query = els.search.value;
        ui.pageLimit = PAGE_SIZE;
        if (ui.query && !['overview', 'transactions'].includes(ui.view)) {
            window.location.hash = 'transactions';
            return;
        }
        renderTransactions();
        icons();
    });

    els.txFilter.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-filter]');
        if (!tab) return;
        ui.filter = tab.dataset.filter;
        ui.pageLimit = PAGE_SIZE;
        els.txFilter.querySelectorAll('[data-filter]').forEach((button) => {
            const active = button === tab;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
        renderTransactions();
        icons();
    });

    $('export-btn').addEventListener('click', exportCsv);
    els.txMore.addEventListener('click', () => {
        ui.pageLimit += PAGE_SIZE;
        renderTransactions();
        icons();
    });

    els.txForm.addEventListener('submit', handleTransactionSubmit);
    els.txForm.addEventListener('change', (event) => {
        if (event.target.name === 'type') fillCategoryOptions(event.target.value);
    });

    els.cardForm.addEventListener('submit', handleCardSubmit);
    els.cardForm.addEventListener('input', (event) => {
        const { name } = event.target;
        if (name === 'number') event.target.value = formatCardNumber(event.target.value);
        if (name === 'expiry') event.target.value = formatExpiry(event.target.value);
        if (name === 'cvv') event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
        syncCardPreview();
    });
    els.cardForm.addEventListener('change', syncCardPreview);
    els.cardForm.elements.cvv.addEventListener('focus', () => els.cardPreview.querySelector('.bank_card')?.classList.add('is-flipped'));
    els.cardForm.elements.cvv.addEventListener('blur', () => els.cardPreview.querySelector('.bank_card')?.classList.remove('is-flipped'));

    els.goalForm.addEventListener('submit', handleGoalSubmit);
    els.depositForm.addEventListener('submit', handleDepositSubmit);
    els.settingsForm.addEventListener('submit', handleSettingsSubmit);

    $('reset-demo').addEventListener('click', () => {
        if (!window.confirm('Replace your data with fresh demo data?')) return;
        const { name, email } = state.profile;
        state = createSeedState({ name, email });
        renderSettings();
        commit('Demo data restored');
    });

    $('clear-data').addEventListener('click', () => {
        if (!window.confirm('Delete all transactions, cards and goals? This cannot be undone.')) return;
        state = { ...state, transactions: [], cards: [], goals: [], activeCardId: null, profile: { ...state.profile, openingBalance: 0 } };
        renderSettings();
        commit('All data cleared');
    });

    els.chart.addEventListener('pointermove', handleChartPointer);
    els.chart.addEventListener('pointerleave', clearChartHover);

    window.addEventListener('hashchange', applyView);
    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return;
        state = loadState();
        renderAll();
    });

    new ResizeObserver(() => requestAnimationFrame(drawChart)).observe(els.chartBox);
    document.fonts?.ready.then(drawChart);
}

save();
bindEvents();
setupFormatters();
applyView();
renderAll();
