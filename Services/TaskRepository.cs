using Collabo.Models;
using System.Collections.Concurrent;

namespace Collabo.Services;

/// <summary>
/// Хранилище задач (сейчас в памяти, потом подключим базу данных)
/// </summary>
public class TaskRepository : ITaskRepository
{
    // Хранилище в памяти (словарь: ключ = ID задачи, значение = задача)
    private readonly ConcurrentDictionary<Guid, TaskItem> _tasks = new();

    public TaskRepository()
    {
        // Добавляем тестовые задачи для демонстрации
        var testTask = new TaskItem
        {
            Id = Guid.NewGuid(),
            Title = "Пример задачи",
            Description = "Это тестовая задача для демонстрации",
            Status = "todo",
            Priority = "medium",
            CreatedAt = DateTime.UtcNow,
            Tags = new List<string> { "пример", "тест" }
        };
        _tasks[testTask.Id] = testTask;
    }

    /// <summary>
    /// Получить все задачи
    /// </summary>
    public Task<List<TaskItem>> GetAllAsync()
    {
        return Task.FromResult(_tasks.Values.ToList());
    }

    /// <summary>
    /// Получить задачу по ID
    /// </summary>
    public Task<TaskItem?> GetByIdAsync(Guid id)
    {
        _tasks.TryGetValue(id, out var task);
        return Task.FromResult(task);
    }

    /// <summary>
    /// Создать новую задачу
    /// </summary>
    public Task<TaskItem> CreateAsync(TaskItem task)
    {
        task.Id = Guid.NewGuid();
        task.CreatedAt = DateTime.UtcNow;
        _tasks[task.Id] = task;
        return Task.FromResult(task);
    }

    /// <summary>
    /// Обновить существующую задачу
    /// </summary>
    public Task<TaskItem?> UpdateAsync(TaskItem task)
    {
        if (!_tasks.ContainsKey(task.Id))
            return Task.FromResult<TaskItem?>(null);

        _tasks[task.Id] = task;
        return Task.FromResult<TaskItem?>(task);
    }

    /// <summary>
    /// Удалить задачу
    /// </summary>
    public Task<bool> DeleteAsync(Guid id)
    {
        var result = _tasks.TryRemove(id, out _);
        return Task.FromResult(result);
    }
}