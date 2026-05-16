// ========== КОНФИГУРАЦИЯ ==========
const API_URL = window.location.origin + "/api";
let tasks = [];
let draggedTaskId = null;

// ========== SIGNALR ==========
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
connection.on("Notification", (message) => {
    showToast(message);
});

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `🔔 ${message}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a1a2e;
        color: #eee;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// ========== ЗАГРУЗКА ЗАДАЧ ==========
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        tasks = await response.json();
        renderTasks();
        updateCounters();
        console.log("Загружено задач:", tasks.length);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
    }
}

// ========== ОТОБРАЖЕНИЕ ==========
function renderTasks() {
    const columns = document.querySelectorAll('.task-list');
    if (columns.length < 3) return;
    
    columns[0].innerHTML = '';
    columns[1].innerHTML = '';
    columns[2].innerHTML = '';
    
    tasks.forEach(task => {
        const card = createTaskCard(task);
        if (task.status === 'todo') columns[0].appendChild(card);
        else if (task.status === 'progress') columns[1].appendChild(card);
        else if (task.status === 'done') columns[2].appendChild(card);
    });
}

function createTaskCard(task) {
    const div = document.createElement('div');
    div.className = 'task-card';
    div.setAttribute('data-id', task.id);
    div.setAttribute('draggable', 'true');
    
    if (task.tags && task.tags.includes('urgent') && task.priority !== 'high') {
        task.priority = 'high';
    }
    
    let priorityClass = '';
    if (task.priority === 'high') priorityClass = 'priority-high';
    else if (task.priority === 'medium') priorityClass = 'priority-medium';
    else if (task.priority === 'low') priorityClass = 'priority-low';
    
    const tagsHtml = task.tags?.length 
        ? `<div class="task-tags">${task.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';
    
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
    const dueHtml = dueDate ? `<div class="due-date">📅 ${dueDate}</div>` : '';
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    
    div.innerHTML = `
        <div class="task-header">
            <h4>${escapeHtml(task.title)}</h4>
            <div class="task-actions">
                <button class="move-btn" onclick="moveTask('${task.id}', 'todo')" title="В начало">📋</button>
                <button class="move-btn" onclick="moveTask('${task.id}', 'progress')" title="В работу">⚙️</button>
                <button class="move-btn" onclick="moveTask('${task.id}', 'done')" title="Готово">✅</button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')" title="Удалить">🗑️</button>
            </div>
        </div>
        <p>${escapeHtml(task.description || '')}</p>
        ${tagsHtml}
        <div class="task-footer">
            <span class="priority ${priorityClass}">${task.priority}</span>
            ${dueHtml}
            <small>${new Date(task.createdAt).toLocaleTimeString()}</small>
        </div>
    `;
    
    if (isOverdue) {
        div.classList.add('task-overdue');
    }
    
    div.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        draggedTaskId = task.id;
        div.classList.add('dragging');
    };
    div.ondragend = () => div.classList.remove('dragging');
    
    return div;
}

async function moveTask(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    
    task.status = newStatus;
    
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
    } catch (error) {
        console.error("Ошибка перемещения:", error);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return;
    
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Ошибка удаления:", error);
    }
}

function updateCounters() {
    const badges = document.querySelectorAll('.badge');
    if (badges.length >= 3) {
        badges[0].textContent = tasks.filter(t => t.status === 'todo').length;
        badges[1].textContent = tasks.filter(t => t.status === 'progress').length;
        badges[2].textContent = tasks.filter(t => t.status === 'done').length;
    }
}

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.task-list');
    
    columns.forEach((column, index) => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            if (!draggedTaskId) return;
            
            let newStatus = 'todo';
            if (index === 1) newStatus = 'progress';
            if (index === 2) newStatus = 'done';
            
            await moveTask(draggedTaskId, newStatus);
            draggedTaskId = null;
        });
    });
}

function openModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.classList.add('active');
    resetForm();
}

function closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.classList.remove('active');
}

function resetForm() {
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) titleInput.value = '';
    const descInput = document.getElementById('taskDesc');
    if (descInput) descInput.value = '';
    const tagsInput = document.getElementById('taskTags');
    if (tagsInput) tagsInput.value = '';
    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput) dueDateInput.value = '';
    
    const statusSelect = document.getElementById('taskStatus');
    if (statusSelect) statusSelect.value = 'todo';
    
    const mediumRadio = document.querySelector('input[name="priority"][value="medium"]');
    if (mediumRadio) mediumRadio.checked = true;
}

async function submitTask() {
    const titleInput = document.getElementById('taskTitle');
    if (!titleInput || !titleInput.value) {
        alert('Введите название задачи');
        return;
    }
    
    const tagsStr = document.getElementById('taskTags')?.value || '';
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
    
    let priority = document.querySelector('input[name="priority"]:checked')?.value || 'medium';
    if (tags.includes('urgent')) {
        priority = 'high';
        showToast("🔴 Тег 'urgent'! Приоритет повышен до HIGH");
    }
    
    const newTask = {
        title: titleInput.value,
        description: document.getElementById('taskDesc')?.value || '',
        status: document.getElementById('taskStatus')?.value || 'todo',
        priority: priority,
        tags: tags,
        dueDate: document.getElementById('taskDueDate')?.value || null
    };
    
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });
        
        if (response.ok) {
            closeModal();
            resetForm();
            await loadTasks();
        } else {
            alert('Ошибка при создании задачи');
        }
    } catch (error) {
        console.error("Ошибка:", error);
        alert('Не удалось создать задачу');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Страница загружена");
    loadTasks();
    setupDragAndDrop();
    
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});

window.openModal = openModal;
window.closeModal = closeModal;
window.submitTask = submitTask;
window.moveTask = moveTask;
window.deleteTask = deleteTask;