document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login_form');
    const passwordInput = document.querySelector('input[type="password"]');
    
    // Ищем иконку глаза внутри блока с паролем
    const togglePasswordIcon = passwordInput?.nextElementSibling;

    // 1. Переключение видимости пароля (показать / скрыть)
    if (togglePasswordIcon && passwordInput) {
        togglePasswordIcon.style.cursor = 'pointer';

        togglePasswordIcon.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        });
    }

    // 2. Обработка отправки формы
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Предотвращаем перезагрузку страницы

            const emailInput = loginForm.querySelector('input[type="text"]');
            const email = emailInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !password) {
                alert('Пожалуйста, заполните все поля!');
                return;
            }

            console.log('Данные для входа:', { email, password });
            alert('Успешный вход!');
        });
    }
});