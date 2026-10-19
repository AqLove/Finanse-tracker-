const SESSION_KEY = 'pf.session';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('toggle-password');
const rememberInput = document.getElementById('remember');
const errorBox = document.getElementById('form-error');

function nameFromEmail(email) {
    const name = email
        .split('@')[0]
        .split(/[._\-+]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    return name || 'Friend';
}

function saveSession(session, persist) {
    try {
        const target = persist ? localStorage : sessionStorage;
        const other = persist ? sessionStorage : localStorage;
        other.removeItem(SESSION_KEY);
        target.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        return false;
    }
    return true;
}

function showError(message, field) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
    [emailInput, passwordInput].forEach((input) => {
        const invalid = input === field;
        input.closest('.inputForm').classList.toggle('invalid', invalid);
        input.setAttribute('aria-invalid', String(invalid));
    });
    field?.focus();
}

function goToDashboard() {
    form.classList.add('is-leaving');
    setTimeout(() => {
        window.location.href = 'main.html';
    }, 350);
}

togglePassword.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePassword.setAttribute('aria-pressed', String(show));
    togglePassword.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

[emailInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => {
        if (input.closest('.inputForm').classList.contains('invalid')) showError('');
    });
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (!EMAIL_PATTERN.test(email)) {
        showError('Enter a valid email address.', emailInput);
        return;
    }
    if (passwordInput.value.length < MIN_PASSWORD_LENGTH) {
        showError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, passwordInput);
        return;
    }

    showError('');
    saveSession({ name: nameFromEmail(email), email, signedInAt: Date.now() }, rememberInput.checked);
    goToDashboard();
});

document.getElementById('forgot-btn').addEventListener('click', () => {
    showError('This is a front-end demo, so there is no password to reset. Any email and a 6+ character password will work.');
});

document.querySelectorAll('[data-demo-login]').forEach((button) => {
    button.addEventListener('click', () => {
        saveSession({ name: 'Demo User', email: 'demo@pf.app', signedInAt: Date.now() }, false);
        goToDashboard();
    });
});
