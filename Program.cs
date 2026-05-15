using Collabo.Consumers;
using Collabo.Hubs;
using Collabo.Models;
using Collabo.Services;
using Collabo.Events;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ========== RABBITMQ (MassTransit) ==========
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<TaskDeletedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
app.UseSwagger();
app.UseSwaggerUI();

app.MapHub<TasksHub>("/tasksHub");

// Хранилище задач
var tasks = new ConcurrentDictionary<Guid, TaskItem>();

// Тестовая задача
tasks[Guid.NewGuid()] = new TaskItem
{
    Id = Guid.NewGuid(),
    Title = "Тестовая задача",
    Status = "todo",
    Priority = "medium",
    CreatedAt = DateTime.UtcNow,
    Tags = new List<string>()
};

// API
app.MapGet("/api/tasks", () => tasks.Values);

app.MapGet("/api/tasks/{id}", (Guid id) =>
    tasks.TryGetValue(id, out var task) ? Results.Ok(task) : Results.NotFound());

app.MapPost("/api/tasks", async (TaskItem task, IHubContext<TasksHub> hub) =>
{
    task.Id = Guid.NewGuid();
    task.CreatedAt = DateTime.UtcNow;
    tasks[task.Id] = task;
    await hub.Clients.All.SendAsync("TaskCreated", task);
    return Results.Ok(task);
});

app.MapPut("/api/tasks/{id}", async (Guid id, TaskItem update, IHubContext<TasksHub> hub) =>
{
    if (!tasks.ContainsKey(id)) return Results.NotFound();
    update.Id = id;
    tasks[id] = update;
    await hub.Clients.All.SendAsync("TaskUpdated", update);
    return Results.Ok(update);
});

app.MapDelete("/api/tasks/{id}", async (Guid id, IHubContext<TasksHub> hub, IPublishEndpoint publishEndpoint) =>
{
    if (!tasks.ContainsKey(id)) return Results.NotFound();
    tasks.TryRemove(id, out _);
    await hub.Clients.All.SendAsync("TaskDeleted", id);
    await publishEndpoint.Publish(new TaskDeletedEvent { TaskId = id });
    return Results.Ok();
});

app.Run();

