// ========== УПРАВЛЕНИЕ ДОСКАМИ ==========
const API_URL = "http://localhost:5000/api";

let currentBoardId = null;
let allBoards = [];

async function loadBoardsFromServer() {
    try {
        const response = await fetch(`${API_URL}/boards`);
        if (!response.ok) throw new Error('Ошибка загрузки досок');
        allBoards = await response.json();
        return allBoards;
    } catch (error) {
        console.error('Ошибка загрузки досок:', error);
        return [];
    }
}

async function createBoardOnServer(name, description = '') {
    try {
        const response = await fetch(`${API_URL}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (!response.ok) throw new Error('Ошибка создания доски');
        const newBoard = await response.json();
        console.log('✅ Доска создана:', newBoard);
        return newBoard;
    } catch (error) {
        console.error('Ошибка создания доски:', error);
        throw error;
    }
}

async function renderBoardsMenu() {
    const menuContainer = document.querySelector('.menu');
    if (!menuContainer) return;
    
    allBoards = await loadBoardsFromServer();
    
    // Если нет досок — создаём дефолтную
    if (allBoards.length === 0) {
        const newBoard = await createBoardOnServer('Моя первая доска');
        allBoards = [newBoard];
        localStorage.setItem('collabo_current_board_id', newBoard.id);
    }
    
    currentBoardId = localStorage.getItem('collabo_current_board_id');
    
    // Проверяем, есть ли текущая доска в списке
    if (!allBoards.find(b => b.id === currentBoardId) && allBoards.length > 0) {
        currentBoardId = allBoards[0].id;
        localStorage.setItem('collabo_current_board_id', currentBoardId);
    }
    
    const createBoardBtn = menuContainer.querySelector('.menu-item[href="create-board.html"]');
    
    const oldBoardItems = menuContainer.querySelectorAll('[data-board-id-container]');
    oldBoardItems.forEach(item => item.remove());
    
    const isBoardPage = window.location.pathname.includes('board.html');
    
    allBoards.forEach(board => {
        const container = document.createElement('div');
        container.setAttribute('data-board-id-container', '');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'space-between';
        container.style.margin = '2px 0';
        
        const boardLink = document.createElement('a');
        boardLink.href = '#';
        boardLink.className = 'menu-item';
        boardLink.textContent = board.name;
        boardLink.dataset.boardId = board.id;
        boardLink.style.flex = '1';
        
        if (currentBoardId === board.id && isBoardPage) {
            boardLink.classList.add('active');
        }
        
        boardLink.addEventListener('click', async (e) => {
            e.preventDefault();
            localStorage.setItem('collabo_current_board_id', board.id);
            window.location.href = 'board.html';
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.color = '#dc3545';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.style.padding = '8px';
        deleteBtn.style.borderRadius = '6px';
        deleteBtn.title = 'Удалить доску';
        
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Удалить доску "${board.name}" со всеми задачами?`)) {
                try {
                    await fetch(`${API_URL}/boards/${board.id}`, { method: 'DELETE' });
                    window.location.href = 'board.html';
                } catch (error) {
                    console.error('Ошибка удаления:', error);
                    alert('Ошибка удаления доски');
                }
            }
        };
        
        container.appendChild(boardLink);
        container.appendChild(deleteBtn);
        
        if (createBoardBtn) {
            menuContainer.insertBefore(container, createBoardBtn);
        } else {
            menuContainer.appendChild(container);
        }
    });
    
    // ========== ОБНОВЛЯЕМ ЗАГОЛОВОК ТОЛЬКО НА СТРАНИЦЕ board.html ==========
    if (isBoardPage) {
        const currentBoard = allBoards.find(b => b.id === currentBoardId);
        const topBarTitle = document.querySelector('.top-bar h1');
        if (topBarTitle && currentBoard) {
            topBarTitle.textContent = currentBoard.name;
        }
    }
    // ========================================================================
}

document.addEventListener('DOMContentLoaded', () => {
    renderBoardsMenu();
});