let isLogin = true;

function toggleAuth() {
    isLogin = !isLogin;
    const title = document.getElementById('title');
    const switchText = document.getElementById('switchText');

    title.innerText = isLogin ? 'Вход в Collabo' : 'Регистрация в Collabo';

    switchText.innerHTML = isLogin
        ? 'Нет аккаунта? <a href="#" onclick="toggleAuth()">Зарегистрироваться</a>'
        : 'Уже есть аккаунт? <a href="#" onclick="toggleAuth()">Войти</a>';
}

// Функция входа/регистрации
async function handleAuth() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    
    if (!email || !password) {
        alert('Заполните все поля');
        return;
    }
    
    if (isLogin) {
        // Вход (пока упрощённо, без реальной авторизации)
        // Позже можно добавить JWT или Identity
        window.location.href = 'MainScreen.html';
    } else {
        // Регистрация
        alert('Регистрация пока в разработке. Используйте вход с любыми данными.');
        // Можно добавить регистрацию через API позже
    }
}

// Привязываем функцию к форме
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('authForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAuth();
        });
    }
});