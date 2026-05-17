// ========== РАБОТА С ДОСКАМИ ЧЕРЕЗ API ==========
// API_URL уже объявлен в api-integration.js

// Загрузка досок с сервера
async function loadBoardsFromServer() {
    try {
        const response = await fetch(`${API_URL}/boards`);
        if (!response.ok) throw new Error('Ошибка загрузки досок');
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки досок:', error);
        return [];
    }
}

// Создание доски на сервере
async function createBoardOnServer(name, description = '') {
    try {
        const response = await fetch(`${API_URL}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (!response.ok) throw new Error('Ошибка создания доски');
        return await response.json();
    } catch (error) {
        console.error('Ошибка создания доски:', error);
        throw error;
    }
}

// Загрузка задач для конкретной доски
async function loadTasksForBoard(boardId) {
    try {
        const response = await fetch(`${API_URL}/boards/${boardId}/tasks`);
        if (!response.ok) throw new Error('Ошибка загрузки задач');
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        return [];
    }
}

// ... остальной код без изменений

// Текущая доска
let currentBoard = null;

// Рендер меню досок
async function renderBoardsMenu() {
    const menuContainer = document.querySelector('.menu');
    if (!menuContainer) return;
    
    // Загружаем доски с сервера
    const boards = await loadBoardsFromServer();
    const currentBoardId = localStorage.getItem('collabo_current_board_id');
    
    // Сохраняем доски в localStorage для быстрого доступа
    localStorage.setItem('collabo_boards', JSON.stringify(boards));
    
    // Находим текущую доску
    currentBoard = boards.find(b => b.id === currentBoardId) || boards[0];
    if (currentBoard) {
        localStorage.setItem('collabo_current_board_id', currentBoard.id);
        const topBarTitle = document.querySelector('.top-bar h1');
        if (topBarTitle) topBarTitle.textContent = currentBoard.name;
    }
    
    // Сохраняем кнопку "Создать доску"
    const createBoardItem = menuContainer.querySelector('.menu-item[href*="create-board"]');
    
    // Удаляем старые пункты досок
    const existingBoardItems = menuContainer.querySelectorAll('.menu-item:not([href*="create-board"])');
    existingBoardItems.forEach(item => item.remove());
    
    // Добавляем доски в меню
    boards.forEach(board => {
        const boardLink = document.createElement('a');
        boardLink.href = '#';
        boardLink.className = 'menu-item';
        boardLink.textContent = board.name;
        boardLink.dataset.boardId = board.id;
        
        if (currentBoard && board.id === currentBoard.id) {
            boardLink.classList.add('active');
        }
        
        boardLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await switchToBoard(board.id);
        });
        
        if (createBoardItem) {
            menuContainer.insertBefore(boardLink, createBoardItem);
        } else {
            menuContainer.appendChild(boardLink);
        }
    });
}

// Переключение между досками
async function switchToBoard(boardId) {
    console.log('Переключение на доску:', boardId);
    
    localStorage.setItem('collabo_current_board_id', boardId);
    
    // Обновляем заголовок
    const boards = JSON.parse(localStorage.getItem('collabo_boards')) || [];
    const board = boards.find(b => b.id === boardId);
    const topBarTitle = document.querySelector('.top-bar h1');
    if (topBarTitle && board) topBarTitle.textContent = board.name;
    
    // Обновляем активный класс
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset && item.dataset.boardId === boardId) {
            item.classList.add('active');
        }
    });
    
    // Загружаем задачи для доски
    if (typeof loadTasksForBoardAndRender !== 'undefined') {
        await loadTasksForBoardAndRender(boardId);
    }
}

// Инициализация
async function initNavigation() {
    await renderBoardsMenu();
    
    const boards = JSON.parse(localStorage.getItem('collabo_boards')) || [];
    if (boards.length === 0) {
        const newBoard = await createBoardOnServer('Моя первая доска', 'Дефолтная доска');
        boards.push(newBoard);
        localStorage.setItem('collabo_boards', JSON.stringify(boards));
        localStorage.setItem('collabo_current_board_id', newBoard.id);
        await renderBoardsMenu();
    }
    
    // Загружаем задачи для текущей доски
    const currentBoardId = localStorage.getItem('collabo_current_board_id');
    if (currentBoardId && typeof loadTasksForBoardAndRender !== 'undefined') {
        await loadTasksForBoardAndRender(currentBoardId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

// Обработка создания доски
const submitBtn = document.querySelector('.btn-submit');
const nameInput = document.querySelector('.input-large');

if (submitBtn && nameInput) {
    submitBtn.addEventListener('click', async () => {
        const boardName = nameInput.value.trim();
        if (!boardName) {
            alert('Введите название доски');
            return;
        }
        
        try {
            const newBoard = await createBoardOnServer(boardName);
            let boards = JSON.parse(localStorage.getItem('collabo_boards')) || [];
            boards.push(newBoard);
            localStorage.setItem('collabo_boards', JSON.stringify(boards));
            localStorage.setItem('collabo_current_board_id', newBoard.id);
            alert(`Доска "${boardName}" создана!`);
            window.location.href = 'board.html';
        } catch (error) {
            alert('Ошибка создания доски');
        }
    });
}