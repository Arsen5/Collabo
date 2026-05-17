// ========== ПРОСТАЯ ВЕРСИЯ - ТОЛЬКО ЗАДАЧИ ==========
const API_URL = window.location.origin + "/api";

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== СОЗДАНИЕ КАРТОЧКИ ==========
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-id', task.id);
    card.setAttribute('draggable', 'true');
    
    // 1. СНАЧАЛА ПРИМЕНЯЕМ ПРАВИЛО URGENT (меняем приоритет задачи)
    if (task.tags && task.tags.includes('urgent')) {
        task.priority = 'high';
    }
    
    // 2. ОПРЕДЕЛЯЕМ КЛАСС ПРИОРИТЕТА
    let priorityClass = 'priority-medium';
    let priorityText = 'Средний';
    if (task.priority === 'high') {
        priorityClass = 'priority-high';
        priorityText = 'Высокий';
    } else if (task.priority === 'low') {
        priorityClass = 'priority-low';
        priorityText = 'Низкий';
    }
    
    // 3. КЛАСС ДЛЯ ЗАВЕРШЁННЫХ ЗАДАЧ
    if (task.status === 'done') {
        card.classList.add('done');
    }
    
    const dueDateDisplay = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не задан';
    const tagsHtml = (task.tags || []).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('');
    
    card.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)} <span class="delete-icon" onclick="deleteTaskById('${task.id}')">🗑</span></div>
        <div class="task-field">Срок: ${dueDateDisplay}</div>
        <div class="task-field">Важность: <span class="priority-badge ${priorityClass}">${priorityText}</span></div>
        <div class="task-tags">${tagsHtml}</div>
    `;
    
    // 4. ПРОВЕРКА НА ПРОСРОЧКУ
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

// ========== ЗАГРУЗКА ЗАДАЧ ==========
async function loadTasks() {
    try {
        console.log('🔄 Загрузка задач с сервера...');
        const response = await fetch(`${API_URL}/tasks`);
        const tasks = await response.json();
        console.log('📦 Получено задач:', tasks.length);
        console.log('Задачи:', tasks);
        
        // Очищаем колонки
        const columns = document.querySelectorAll('.column');
        console.log('📂 Найдено колонок:', columns.length);
        
        columns.forEach(col => {
            const cards = col.querySelectorAll('.task-card');
            cards.forEach(card => card.remove());
        });
        
        // Добавляем задачи в колонки
        tasks.forEach(task => {
            let columnTitle = 'To-Do';
            if (task.status === 'progress') columnTitle = 'In Progress';
            else if (task.status === 'done') columnTitle = 'Done';
            
            const column = Array.from(columns).find(
                col => col.querySelector('.column-title').textContent.trim() === columnTitle
            );
            
            if (column) {
                const card = createTaskCard(task);
                const addBtn = column.querySelector('.add-task-btn');
                if (addBtn) column.insertBefore(card, addBtn);
                else column.appendChild(card);
                console.log(`  ✅ Добавлена задача "${task.title}" в колонку ${columnTitle}`);
            } else {
                console.log(`  ⚠️ Не найдена колонка для статуса: ${task.status}`);
            }
        });
        
        console.log('✅ Загрузка завершена');
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
    }
}

// ========== СОЗДАНИЕ ЗАДАЧИ ==========
async function createTaskAPI(taskData) {
    try {
        // Преобразуем дату в ISO формат
        let formattedDueDate = null;
        if (taskData.dueDate) {
            formattedDueDate = new Date(taskData.dueDate).toISOString();
        }
        
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: taskData.title,
                description: taskData.description || '',
                status: taskData.status,
                priority: taskData.priority || 'medium',
                tags: taskData.tags || [],
                dueDate: formattedDueDate
            })
        });
        
        if (!response.ok) throw new Error('Ошибка создания');
        const newTask = await response.json();
        console.log('Задача создана:', newTask);
        return newTask;
    } catch (error) {
        console.error('Ошибка создания задачи:', error);
        throw error;
    }
}

// ========== УДАЛЕНИЕ ЗАДАЧИ ==========
async function deleteTaskAPI(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        console.log('Задача удалена:', taskId);
        return true;
    } catch (error) {
        console.error('Ошибка удаления:', error);
        throw error;
    }
}

// ========== ОБНОВЛЕНИЕ ЗАДАЧИ (DRAG & DROP) ==========
async function updateTaskStatus(taskId, newStatus) {
    try {
        // Сначала получаем задачу
        const getResponse = await fetch(`${API_URL}/tasks/${taskId}`);
        const task = await getResponse.json();
        
        // Обновляем статус
        task.status = newStatus;
        
        // Отправляем обновление
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        
        if (!response.ok) throw new Error('Ошибка обновления');
        console.log('Статус обновлён:', taskId, '->', newStatus);
        return true;
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        throw error;
    }
}

// ========== SIGNALR REAL-TIME ==========
function initSignalR() {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(window.location.origin + "/tasksHub")
        .withAutomaticReconnect()
        .build();
    
    connection.start()
        .then(() => console.log("✅ SignalR подключён"))
        .catch(err => console.error("❌ SignalR ошибка:", err));
    
    connection.on("TaskCreated", () => loadTasks());
    connection.on("TaskUpdated", () => loadTasks());
    connection.on("TaskDeleted", () => loadTasks());
    
    return connection;
}

// ========== ОБРАБОТЧИК КНОПКИ "СОЗДАТЬ" ==========
window.submitTask = async function() {
    console.log('🔵 Кнопка "Создать" нажата!');
    
    if (!window.currentColumnForNewTask) return;
    
    const modal = document.getElementById('add-task-modal');
    const nameInput = modal.querySelector('input[type="text"]');
    const descInput = modal.querySelector('textarea');
    const selects = modal.querySelectorAll('select');
    const prioritySelect = selects[1];
    const dateInput = modal.querySelector('input[type="date"]');
    const tagsInput = modal.querySelector('input[placeholder*="design"]');
    
    const title = nameInput?.value.trim();
    if (!title) {
        alert('Введите название задачи');
        return;
    }
    
    const columnTitle = window.currentColumnForNewTask.querySelector('.column-title').textContent.trim();
    let status = 'todo';
    if (columnTitle === 'In Progress') status = 'progress';
    else if (columnTitle === 'Done') status = 'done';
const tags = tagsInput?.value ? tagsInput.value.split(',').map(t => t.trim()) : [];

let priority = 'medium';
const priorityText = prioritySelect?.options[prioritySelect.selectedIndex]?.text;
if (priorityText === 'Высокий') priority = 'high';
else if (priorityText === 'Низкий') priority = 'low';

let isUrgent = tags.includes('urgent');
if (isUrgent) {
    priority = 'high';
    console.log('🔴 Тег urgent обнаружен, приоритет HIGH');
}

// Если есть тег urgent, приоритет становится высоким
if (tags.includes('urgent')) {
    priority = 'high';
}
    const dueDate = dateInput?.value || null;
    
    try {
        await createTaskAPI({
            title: title,
            description: descInput?.value || '',
            status: status,
            priority: priority,
            tags: tags,
            dueDate: dueDate
        });
        
        // ========== УВЕДОМЛЕНИЕ ПРИ ВЫСОКОМ ПРИОРИТЕТЕ ==========
        if (priority === 'high') {
            showNotification('⚠️ Создана задача с высоким приоритетом: ' + title);
        }
        // =====================================================
        if (isUrgent) {
        showNotification('🔴 Тег "urgent"! Приоритет повышен до HIGH: ' + title);
    }
        // Очистка формы
        nameInput.value = '';
        if (descInput) descInput.value = '';
        if (dateInput) dateInput.value = '';
        if (tagsInput) tagsInput.value = '';
        
        modal.classList.add('hidden');
        window.currentColumnForNewTask = null;
        
        await loadTasks();
    } catch (error) {
        console.error('Ошибка создания:', error);
        alert('Не удалось создать задачу');
    }
};

// ========== УДАЛЕНИЕ ==========
window.deleteTaskById = async function(taskId) {
    if (!confirm('Удалить задачу?')) return;
    try {
        await deleteTaskAPI(taskId);
        await loadTasks();
    } catch (error) {
        alert('Ошибка при удалении');
    }
};

// ========== DRAG & DROP ==========
let draggedTaskId = null;

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column');
    
    columns.forEach((column, index) => {
        column.addEventListener('dragover', (e) => e.preventDefault());
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!draggedTaskId) return;
            
            let newStatus = 'todo';
            if (index === 1) newStatus = 'progress';
            else if (index === 2) newStatus = 'done';
            
            await updateTaskStatus(draggedTaskId, newStatus);
            draggedTaskId = null;
            await loadTasks();
        });
    });
    
    document.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.task-card');
        if (card) {
            draggedTaskId = card.dataset.id;
            card.style.opacity = '0.5';
        }
    });
    
    document.addEventListener('dragend', (e) => {
        const card = e.target.closest('.task-card');
        if (card) card.style.opacity = '1';
        draggedTaskId = null;
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    initSignalR();
    loadTasks();
    setupDragAndDrop();
});
// Привязываем обработчик к кнопке после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    const createBtn = document.querySelector('#add-task-modal .modal-submit-btn');
    if (createBtn) {
        createBtn.onclick = () => {
            console.log('🔵 Клик по кнопке создания');
            submitTask();
        };
    }
});
// Отслеживаем, на какой колонке нажали "+ Добавить задачу"
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-task-btn')) {
        window.currentColumnForNewTask = e.target.closest('.column');
        console.log('🔵 Текущая колонка для задачи:', window.currentColumnForNewTask?.querySelector('.column-title')?.textContent);
    }
});
// Проверка на просрочку
const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
if (isOverdue) {
    card.classList.add('task-overdue');
    // Добавляем значок просрочки
    const titleDiv = card.querySelector('.task-title');
    if (titleDiv && !titleDiv.innerHTML.includes('⚠️')) {
        titleDiv.innerHTML = '⚠️ ' + titleDiv.innerHTML;
    }
}
// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔵 DOM загружен');
    initSignalR();
    loadTasks();
    setupDragAndDrop();
});
function showNotification(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: fadeInOut 3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Добавим стиль анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(100%); }
        10% { opacity: 1; transform: translateX(0); }
        90% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);
console.log("✅ API Integration загружена (простая версия)");