// ========== УПРАВЛЕНИЕ ДОСКАМИ ==========
const API_URL = "http://localhost:5000/api";

async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'auth.html';
    }
    return response;
}

async function loadBoards() {
    try {
        // Используем /api/user/boards (свои + приглашённые)
        const response = await authFetch(`${API_URL}/user/boards`);
        const boards = await response.json();
        console.log('📋 Доски загружены:', boards);
        return boards;
    } catch (error) {
        console.error('Ошибка загрузки досок:', error);
        return [];
    }
}

async function createBoardOnServer(name) {
    const response = await authFetch(`${API_URL}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Ошибка создания доски');
    return await response.json();
}

async function renderBoards() {
    const menuContainer = document.querySelector('.menu');
    if (!menuContainer) return;
    
    const boards = await loadBoards();
    const currentBoardId = localStorage.getItem('collabo_current_board_id');
    
    const createBtn = menuContainer.querySelector('.menu-item[href="create-board.html"]');
    
    const oldItems = menuContainer.querySelectorAll('.board-item');
    oldItems.forEach(item => item.remove());
    
    boards.forEach(board => {
        const container = document.createElement('div');
        container.className = 'board-item';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'space-between';
        container.style.margin = '2px 0';
        
        const boardLink = document.createElement('a');
        boardLink.href = '#';
        boardLink.className = 'menu-item';
        boardLink.textContent = board.name;
        boardLink.style.flex = '1';
        boardLink.style.cursor = 'pointer';
        
        if (currentBoardId === board.id) {
            boardLink.classList.add('active');
        }
        
        boardLink.addEventListener('click', (e) => {
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
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.title = 'Удалить доску';
        
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            const boardName = board.name || 'эту доску';
            if (confirm(`Удалить доску "${boardName}" со всеми задачами?`)) {
                await authFetch(`${API_URL}/boards/${board.id}`, { method: 'DELETE' });
                window.location.href = 'board.html';
            }
        };
        
        container.appendChild(boardLink);
        container.appendChild(deleteBtn);
        
        if (createBtn) {
            menuContainer.insertBefore(container, createBtn);
        } else {
            menuContainer.appendChild(container);
        }
    });
    
    // Обновляем заголовок на странице board.html
    if (window.location.pathname.includes('board.html')) {
        const currentBoard = boards.find(b => b.id === currentBoardId);
        const titleEl = document.querySelector('.top-bar h1');
        if (titleEl && currentBoard) {
            titleEl.textContent = currentBoard.name;
        } else if (titleEl && boards.length > 0) {
            titleEl.textContent = boards[0].name;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderBoards();
});