// ========== API КОНФИГУРАЦИЯ ==========
const API_URL = window.location.origin + "/api";

// ========== РАБОТА С ЗАДАЧАМИ ==========
async function fetchTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) throw new Error('Ошибка загрузки задач');
        return await response.json();
    } catch (error) {
        console.error('Ошибка fetchTasks:', error);
        return [];
    }
}

async function createTask(taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Ошибка создания задачи');
        return await response.json();
    } catch (error) {
        console.error('Ошибка createTask:', error);
        throw error;
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Ошибка обновления задачи');
        return await response.json();
    } catch (error) {
        console.error('Ошибка updateTask:', error);
        throw error;
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Ошибка удаления задачи');
        return true;
    } catch (error) {
        console.error('Ошибка deleteTask:', error);
        throw error;
    }
}

// ========== SIGNALR ==========
let connection = null;

function initSignalR(onTaskCreated, onTaskUpdated, onTaskDeleted) {
    if (connection) return connection;
    
    connection = new signalR.HubConnectionBuilder()
        .withUrl(window.location.origin + "/tasksHub")
        .withAutomaticReconnect()
        .build();
    
    connection.start()
        .then(() => console.log("✅ SignalR подключён"))
        .catch(err => console.error("❌ SignalR ошибка:", err));
    
    if (onTaskCreated) connection.on("TaskCreated", onTaskCreated);
    if (onTaskUpdated) connection.on("TaskUpdated", onTaskUpdated);
    if (onTaskDeleted) connection.on("TaskDeleted", onTaskDeleted);
    
    return connection;
}

// ========== ПРЕОБРАЗОВАНИЕ ДАННЫХ ==========
// Преобразует задачу из бэкенда в формат для UI
function fromBackendTask(task) {
    return {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status === 'todo' ? 'To-Do' : 
                task.status === 'progress' ? 'In Progress' : 
                task.status === 'done' ? 'Done' : 'To-Do',
        priority: task.priority || 'medium',
        priorityText: task.priority === 'high' ? 'Высокий' : 
                      task.priority === 'medium' ? 'Средний' : 'Низкий',
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не задан',
        tags: task.tags || [],
        createdAt: new Date(task.createdAt).toLocaleDateString('ru-RU')
    };
}

// Преобразует задачу из UI в формат для бэкенда
function toBackendTask(task) {
    let status = 'todo';
    if (task.status === 'In Progress') status = 'progress';
    else if (task.status === 'Done') status = 'done';
    
    let priority = 'medium';
    if (task.priorityText === 'Высокий') priority = 'high';
    else if (task.priorityText === 'Низкий') priority = 'low';
    
    return {
        title: task.title,
        description: task.description,
        status: status,
        priority: priority,
        tags: task.tags || [],
        dueDate: task.dueDate && task.dueDate !== 'Не задан' ? task.dueDate : null
    };
}