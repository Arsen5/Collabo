const API_URL = window.location.origin + "/api";

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
    });
    
    if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        toggleAuth();
    } else {
        alert('Ошибка регистрации');
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
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
        window.location.href = 'MainScreen.html';
    } else {
        alert('Неверный email или пароль');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    window.location.href = 'auth.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && window.location.pathname.includes('MainScreen.html')) {
        window.location.href = 'auth.html';
    }
}