using Collabo.Hubs;
using Collabo.Models;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

// PUT: обновить задачу
app.MapPut("/api/tasks/{id}", async (Guid id, TaskItem update, IHubContext<TasksHub> hub) =>
{
    if (!tasks.ContainsKey(id)) return Results.NotFound();

    update.Id = id;
    tasks[id] = update;

    await hub.Clients.All.SendAsync("TaskUpdated", update);
    return Results.Ok(update);
});

// DELETE: удалить задачу
app.MapDelete("/api/tasks/{id}", async (Guid id, IHubContext<TasksHub> hub) =>
{
    if (!tasks.ContainsKey(id)) return Results.NotFound();

    tasks.TryRemove(id, out _);
    await hub.Clients.All.SendAsync("TaskDeleted", id);
    return Results.Ok();
});

app.Run();