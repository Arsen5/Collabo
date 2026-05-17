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