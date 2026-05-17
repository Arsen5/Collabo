// ========== API INTEGRATION ==========
window.API_URL = window.location.origin + "/api";
console.log('API_URL установлен:', window.API_URL);

// Получаем токен
const token = localStorage.getItem('token');

// Функция для fetch с авторизацией
async function authFetch(url, options = {}) {
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-id', task.id);
    card.setAttribute('draggable', 'true');
    
    if (task.tags && task.tags.includes('urgent')) {
        task.priority = 'high';
    }
    
    let priorityClass = 'priority-medium';
    let priorityText = 'Средний';
    if (task.priority === 'high') {
        priorityClass = 'priority-high';
        priorityText = 'Высокий';
    } else if (task.priority === 'low') {
        priorityClass = 'priority-low';
        priorityText = 'Низкий';
    }
    
    if (task.status === 'done') {
        card.classList.add('done');
    }
    
    const dueDateDisplay = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не задан';
    const tagsHtml = (task.tags || []).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('');
    
    let assigneeText = 'Не назначен';
    if (task.assignee === 'user1') assigneeText = 'Иван Иванов';
    else if (task.assignee === 'user2') assigneeText = 'Анна Смирнова';
    else if (task.assignee && task.assignee !== '') assigneeText = task.assignee;
    
    const assigneeHtml = `<div class="task-field">Исполнитель: ${assigneeText}</div>`;
    
    card.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)} <span class="delete-icon" onclick="deleteTaskById('${task.id}')">🗑</span></div>
        <div class="task-field">Срок: ${dueDateDisplay}</div>
        <div class="task-field">Важность: <span class="priority-badge ${priorityClass}">${priorityText}</span></div>
        ${assigneeHtml}
        <div class="task-tags">${tagsHtml}</div>
    `;
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    if (isOverdue) {
        card.classList.add('task-overdue');
        const titleDiv = card.querySelector('.task-title');
        if (titleDiv && !titleDiv.innerHTML.includes('⚠️')) {
            titleDiv.innerHTML = '⚠️ ' + titleDiv.innerHTML;
        }
    }
    
    return card;
}

function getCurrentBoardId() {
    return localStorage.getItem('collabo_current_board_id');
}

// ========== ФИЛЬТРАЦИЯ ==========
let currentTasks = [];
let filterSearch = '';
let filterPriority = 'all';
let filterStatus = 'all';

function filterTasks(tasks) {
    return tasks.filter(task => {
        const matchesSearch = filterSearch === '' || task.title.toLowerCase().includes(filterSearch.toLowerCase());
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        let statusMatch = filterStatus === 'all';
        if (filterStatus === 'todo') statusMatch = task.status === 'todo';
        else if (filterStatus === 'progress') statusMatch = task.status === 'progress';
        else if (filterStatus === 'done') statusMatch = task.status === 'done';
        
        return matchesSearch && matchesPriority && statusMatch;
    });
}

function renderFilteredTasks(tasks) {
    const columns = document.querySelectorAll('.column');
    columns.forEach(col => {
        col.querySelectorAll('.task-card').forEach(card => card.remove());
    });
    
    tasks.forEach(task => {
        let columnTitle = task.status === 'progress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'To-Do';
        const column = Array.from(columns).find(col => col.querySelector('.column-title').textContent.trim() === columnTitle);
        if (column) {
            const card = createTaskCard(task);
            const addBtn = column.querySelector('.add-task-btn');
            addBtn ? column.insertBefore(card, addBtn) : column.appendChild(card);
        }
    });
}

async function renderTasksForBoard(boardId) {
    if (!boardId) {
        console.warn('Нет boardId для загрузки задач');
        return;
    }
    
    console.log('🔄 Загрузка задач для доски:', boardId);
    
    try {
        const response = await authFetch(`${window.API_URL}/boards/${boardId}/tasks`);
        if (!response.ok) throw new Error('Ошибка загрузки задач');
        currentTasks = await response.json();
        
        const filtered = filterTasks(currentTasks);
        renderFilteredTasks(filtered);
        
        console.log(`✅ Отображено ${filtered.length} задач из ${currentTasks.length} для доски ${boardId}`);
    } catch (error) {
        console.error('Ошибка загрузки задач для доски:', error);
    }
}

async function createTaskAPI(taskData) {
    const currentBoardId = getCurrentBoardId();
    let formattedDueDate = taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null;
    
    const response = await authFetch(`${window.API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status,
            priority: taskData.priority || 'medium',
            tags: taskData.tags || [],
            dueDate: formattedDueDate,
            boardId: currentBoardId,
            assignee: taskData.assignee || ''
        })
    });
    if (!response.ok) throw new Error('Ошибка создания');
    return await response.json();
}

async function deleteTaskAPI(taskId) {
    const response = await authFetch(`${window.API_URL}/tasks/${taskId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Ошибка удаления');
    return true;
}

async function updateTaskStatus(taskId, newStatus) {
    const getResponse = await authFetch(`${window.API_URL}/tasks/${taskId}`);
    const task = await getResponse.json();
    task.status = newStatus;
    await authFetch(`${window.API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
}

async function updateTaskDetails(taskId, updatedData) {
    console.log('🔧 updateTaskDetails вызвана, ID:', taskId, 'Данные:', updatedData);
    const response = await authFetch(`${window.API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });
    const result = await response.json();
    console.log('📦 Результат обновления:', result);
    if (!response.ok) throw new Error('Ошибка обновления задачи');
    return result;
}

function initSignalR() {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(window.location.origin + "/tasksHub")
        .withAutomaticReconnect()
        .build();
    
    connection.start()
        .then(() => console.log("✅ SignalR подключён"))
        .catch(err => console.error("❌ SignalR ошибка:", err));
    
    connection.on("TaskCreated", () => {
        const boardId = getCurrentBoardId();
        if (boardId) renderTasksForBoard(boardId);
    });
    connection.on("TaskUpdated", () => {
        const boardId = getCurrentBoardId();
        if (boardId) renderTasksForBoard(boardId);
    });
    connection.on("TaskDeleted", () => {
        const boardId = getCurrentBoardId();
        if (boardId) renderTasksForBoard(boardId);
    });
    
    return connection;
}

window.submitTask = async function() {
    console.log('🔵 Кнопка "Создать" нажата!');
    if (!window.currentColumnForNewTask) return;
    
    const modal = document.getElementById('add-task-modal');
    const titleInput = document.getElementById('taskTitle');
    const descInput = document.getElementById('taskDesc');
    const assigneeSelect = document.getElementById('taskAssignee');
    const prioritySelect = document.getElementById('taskPriority');
    const dateInput = document.getElementById('taskDueDate');
    const tagsInput = document.getElementById('taskTags');
    
    const title = titleInput?.value.trim();
    if (!title) {
        alert('Введите название задачи');
        return;
    }
    
    const columnTitle = window.currentColumnForNewTask.querySelector('.column-title').textContent.trim();
    let status = columnTitle === 'In Progress' ? 'progress' : columnTitle === 'Done' ? 'done' : 'todo';
    
    const tags = tagsInput?.value ? tagsInput.value.split(',').map(t => t.trim()) : [];
    let priority = prioritySelect?.value || 'medium';
    
    const isUrgent = tags.includes('urgent');
    if (isUrgent) priority = 'high';
    
    const dueDate = dateInput?.value || null;
    const assignee = assigneeSelect?.options[assigneeSelect.selectedIndex]?.text || '';
    
    const currentBoardId = getCurrentBoardId();
    
    try {
        await createTaskAPI({
            title, description: descInput?.value || '',
            status, priority, tags, dueDate, boardId: currentBoardId, assignee
        });
        
        if (priority === 'high') showNotification('⚠️ Создана задача с высоким приоритетом: ' + title);
        if (isUrgent) showNotification('🔴 Тег "urgent"! Приоритет повышен до HIGH: ' + title);
        
        titleInput.value = '';
        if (descInput) descInput.value = '';
        if (dateInput) dateInput.value = '';
        if (tagsInput) tagsInput.value = '';
        if (assigneeSelect) assigneeSelect.value = '';
        prioritySelect.value = 'medium';
        
        modal.classList.add('hidden');
        window.currentColumnForNewTask = null;
        
        if (currentBoardId) await renderTasksForBoard(currentBoardId);
    } catch (error) {
        console.error('Ошибка создания:', error);
        alert('Не удалось создать задачу');
    }
};

window.deleteTaskById = async function(taskId) {
    if (!confirm('Удалить задачу?')) return;
    await deleteTaskAPI(taskId);
    const boardId = getCurrentBoardId();
    if (boardId) await renderTasksForBoard(boardId);
};

let draggedTaskId = null;

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column');
    columns.forEach((column, index) => {
        column.addEventListener('dragover', e => e.preventDefault());
        column.addEventListener('drop', async e => {
            e.preventDefault();
            if (!draggedTaskId) return;
            let newStatus = index === 0 ? 'todo' : index === 1 ? 'progress' : 'done';
            await updateTaskStatus(draggedTaskId, newStatus);
            draggedTaskId = null;
            const boardId = getCurrentBoardId();
            if (boardId) await renderTasksForBoard(boardId);
        });
    });
    
    document.addEventListener('dragstart', e => {
        const target = e.target;
        if (target && typeof target.closest === 'function') {
            const card = target.closest('.task-card');
            if (card) {
                draggedTaskId = card.dataset.id;
                card.style.opacity = '0.5';
            }
        }
    });
    
    document.addEventListener('dragend', e => {
        const target = e.target;
        if (target && typeof target.closest === 'function') {
            const card = target.closest('.task-card');
            if (card) card.style.opacity = '1';
            draggedTaskId = null;
        }
    });
}

function showNotification(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:#dc3545;color:white;padding:12px 20px;border-radius:8px;z-index:10000;animation:fadeInOut 3s ease;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `@keyframes fadeInOut{0%{opacity:0;transform:translateX(100%)}10%{opacity:1;transform:translateX(0)}90%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(100%)}}`;
document.head.appendChild(style);

function exportToJSON() {
    const data = JSON.stringify(currentTasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board_export_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToCSV() {
    if (!currentTasks || !currentTasks.length) {
        alert('Нет задач для экспорта');
        return;
    }
    
    const headers = ['ID', 'Название', 'Описание', 'Статус', 'Приоритет', 'Теги', 'Дедлайн', 'Создана'];
    const rows = currentTasks.map(task => [
        task.id,
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        task.status === 'todo' ? 'К исполнению' : task.status === 'progress' ? 'В работе' : 'Готово',
        task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий',
        `"${(task.tags || []).join(', ')}"`,
        task.dueDate || '',
        new Date(task.createdAt).toLocaleString()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board_export_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    initSignalR();
    setupDragAndDrop();
    
    const boardId = getCurrentBoardId();
    if (boardId) {
        await renderTasksForBoard(boardId);
    }
    
    const searchInput = document.getElementById('searchInput');
    const priorityFilter = document.getElementById('priorityFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSearch = e.target.value;
            const boardId = getCurrentBoardId();
            if (boardId) renderTasksForBoard(boardId);
        });
    }
    if (priorityFilter) {
        priorityFilter.addEventListener('change', (e) => {
            filterPriority = e.target.value;
            const boardId = getCurrentBoardId();
            if (boardId) renderTasksForBoard(boardId);
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filterStatus = e.target.value;
            const boardId = getCurrentBoardId();
            if (boardId) renderTasksForBoard(boardId);
        });
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-task-btn')) {
        window.currentColumnForNewTask = e.target.closest('.column');
    }
});

window.renderTasksForBoard = renderTasksForBoard;
window.updateTaskDetails = updateTaskDetails;
console.log("✅ API Integration загружена");