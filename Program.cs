using Microsoft.AspNetCore.SignalR;
using MassTransit;
using TaskFlow; // Если создашь KanbanHub в этом пространстве имен

using Collabo.Hubs;
using Collabo.Models;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

// --- СЕКЦИЯ СЕРВИСОВ (Регистрируем инструменты) ---

builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 1. Добавляем SignalR для Real-time синхронизации
builder.Services.AddSignalR();

// 2. Настройка MassTransit для работы с RabbitMQ (Event-driven)
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<TaskDeletedConsumer>(); // Вот эта строчка!

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/");
        cfg.ConfigureEndpoints(context); // А эта строка создаст очередь в RabbitMQ автоматически
    });
});

var app = builder.Build();

// --- СЕКЦИЯ КОНФИГУРАЦИИ (Настраиваем пути) ---

if (app.Environment.IsDevelopment())
app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
app.UseSwagger();
app.UseSwaggerUI();

app.MapHub<TasksHub>("/tasksHub");

// Временное хранилище задач (в памяти)
var tasks = new ConcurrentDictionary<Guid, TaskItem>();

// Добавляем тестовую задачу
var testTask = new TaskItem
{
    Id = Guid.NewGuid(),
    Title = "Тестовая задача",
    Description = "Проверка работы API",
    Status = "todo",
    Priority = "medium",
    CreatedAt = DateTime.UtcNow,
    Tags = new List<string>()
};
tasks[testTask.Id] = testTask;

// GET: получить все задачи
app.MapGet("/api/tasks", () => tasks.Values);

// 3. Маршрут для Real-time подключения (Hub)
app.MapHub<KanbanHub>("/kanban");
// GET: получить задачу по ID
app.MapGet("/api/tasks/{id}", (Guid id) =>
{
    tasks.TryGetValue(id, out var task);
    return task is not null ? Results.Ok(task) : Results.NotFound();
});

// POST: создать задачу
app.MapPost("/api/tasks", async (TaskItem task, IHubContext<TasksHub> hub) =>
{
    task.Id = Guid.NewGuid();
    task.CreatedAt = DateTime.UtcNow;
    tasks[task.Id] = task;

    await hub.Clients.All.SendAsync("TaskCreated", task);
    return Results.Ok(task);
});

// Пример обычного API (можно оставить или удалить)
var summaries = new[] { "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching" };
app.MapGet("/weatherforecast", () =>
// PUT: обновить задачу
app.MapPut("/api/tasks/{id}", async (Guid id, TaskItem update, IHubContext<TasksHub> hub) =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");
    if (!tasks.ContainsKey(id)) return Results.NotFound();

    update.Id = id;
    tasks[id] = update;

    await hub.Clients.All.SendAsync("TaskUpdated", update);
    return Results.Ok(update);
});

// Модель данных
record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
// DELETE: удалить задачу
app.MapDelete("/api/tasks/{id}", async (Guid id, IHubContext<TaskHub> hub, IPublishEndpoint publishEndpoint) =>
{
    if (tasks.TryRemove(id, out _))
    {
        // 1. Уведомляем тех, кто сейчас на сайте через SignalR
        await hub.Clients.All.SendAsync("TaskDeleted", id);

        // 2. Отправляем событие в RabbitMQ через MassTransit для фоновых процессов
        await publishEndpoint.Publish(new TaskDeleted { Id = id });

        return Results.Ok();
    }
    return Results.NotFound();
});