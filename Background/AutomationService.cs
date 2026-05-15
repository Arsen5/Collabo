using Collabo.Models;
using Collabo.Services;
using Microsoft.AspNetCore.SignalR;
using Collabo.Hubs;

namespace Collabo.Background;

/// <summary>
/// Фоновый сервис, который обрабатывает события и применяет правила
/// </summary>
public class AutomationService : BackgroundService
{
    private readonly IEventQueue _queue;
    private readonly ITaskRepository _repository;
    private readonly IHubContext<TasksHub> _hubContext;
    private readonly ILogger<AutomationService> _logger;

    public AutomationService(
        IEventQueue queue,
        ITaskRepository repository,
        IHubContext<TasksHub> hubContext,
        ILogger<AutomationService> logger)
    {
        _queue = queue;
        _repository = repository;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 Сервис автоматизации запущен");

        // Постоянно слушаем очередь событий
        await foreach (var eventMessage in _queue.ConsumeAsync(stoppingToken))
        {
            try
            {
                await ProcessEventAsync(eventMessage, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при обработке события {EventType}", eventMessage.Type);
            }
        }
    }

    private async Task ProcessEventAsync(TaskEvent eventMessage, CancellationToken cancellationToken)
    {
        _logger.LogInformation("📨 Обработка события: {EventType} для задачи {TaskId}",
            eventMessage.Type, eventMessage.TaskId);

        // Получаем актуальную задачу
        var task = await _repository.GetByIdAsync(eventMessage.TaskId);
        if (task == null) return;

        bool wasUpdated = false;

        // ПРАВИЛО 1: Если дедлайн просрочен → переместить в "overdue"
        if (task.DueDate.HasValue && task.DueDate < DateTime.UtcNow && task.Status != "overdue")
        {
            task.Status = "overdue";
            wasUpdated = true;
            _logger.LogInformation("✅ Правило 1: Задача {TaskId} просрочена → перемещена в overdue", task.Id);
        }

        // ПРАВИЛО 2: Если есть тег "urgent" → приоритет high и подсветка
        if (task.Tags.Contains("urgent") && task.Priority != "high")
        {
            task.Priority = "high";
            wasUpdated = true;
            _logger.LogInformation("✅ Правило 2: Задача {TaskId} с тегом urgent → приоритет high", task.Id);
        }

        // ПРАВИЛО 3: Если приоритет "high" и статус "todo" → уведомление
        if (task.Priority == "high" && task.Status == "todo")
        {
            await _hubContext.Clients.All.SendAsync("Notification", new
            {
                Message = $"⚠️ Высокий приоритет: {task.Title}",
                TaskId = task.Id,
                Type = "priority_alert"
            });
            _logger.LogInformation("✅ Правило 3: Отправлено уведомление о высокой приоритете задачи {TaskId}", task.Id);
        }

        // Сохраняем изменения, если были
        if (wasUpdated)
        {
            await _repository.UpdateAsync(task);

            // Оповещаем всех клиентов об изменении
            await _hubContext.Clients.All.SendAsync("TaskUpdated", task);
            _logger.LogInformation("📤 Отправлено real-time обновление для задачи {TaskId}", task.Id);
        }
    }
}