let isLogin = true;

function toggleAuth() {
    isLogin = !isLogin;
    const title = document.getElementById('title');
    const switchText = document.getElementById('switchText');
    localStorage.clear();
localStorage.setItem('token', data.token);
localStorage.setItem('userId', data.userId);
localStorage.setItem('userName', data.userName);
localStorage.setItem('userEmail', email);
    title.innerText = isLogin ? 'Вход в Collabo' : 'Регистрация в Collabo';

    switchText.innerHTML = isLogin
        ? 'Нет аккаунта? <a href="#" onclick="toggleAuth()">Зарегистрироваться</a>'
        : 'Уже есть аккаунт? <a href="#" onclick="toggleAuth()">Войти</a>';
}
async function login(email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userName', data.userName);
            localStorage.setItem('userEmail', email);  // ← ДОБАВИТЬ ЭТУ СТРОКУ
            window.location.href = 'board.html';
        } else {
            alert('Неверный email или пароль');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось подключиться к серверу');
    }
}