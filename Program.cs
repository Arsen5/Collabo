using Collabo.Hubs;
using Collabo.Models;
using Collabo.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = "Host=localhost; Database=taskflow; Username=postgres; Password=postgres";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.WebHost.UseUrls("http://0.0.0.0:5000");

var app = builder.Build();

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
app.UseSwagger();
app.UseSwaggerUI();

app.MapHub<TasksHub>("/tasksHub");

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "hak")),
    RequestPath = ""
});

// ========== API ДОСОК ==========

// Получить все доски
app.MapGet("/api/boards", async (AppDbContext db) =>
{
    var boards = await db.Boards.ToListAsync();
    return Results.Ok(boards);
});

// Получить доску по ID
app.MapGet("/api/boards/{id}", async (Guid id, AppDbContext db) =>
{
    var board = await db.Boards.FindAsync(id);
    return board is not null ? Results.Ok(board) : Results.NotFound();
});

// Создать доску
app.MapPost("/api/boards", async (Board board, AppDbContext db) =>
{
    board.Id = Guid.NewGuid();
    board.CreatedAt = DateTime.UtcNow;
    db.Boards.Add(board);
    await db.SaveChangesAsync();
    return Results.Ok(board);
});

// Обновить доску
app.MapPut("/api/boards/{id}", async (Guid id, Board update, AppDbContext db) =>
{
    var board = await db.Boards.FindAsync(id);
    if (board is null) return Results.NotFound();

    board.Name = update.Name;
    board.Description = update.Description;

    await db.SaveChangesAsync();
    return Results.Ok(board);
});

// Удалить доску (и все её задачи)
app.MapDelete("/api/boards/{id}", async (Guid id, AppDbContext db) =>
{
    var board = await db.Boards.FindAsync(id);
    if (board is null) return Results.NotFound();

    var tasks = db.Tasks.Where(t => t.BoardId == id);
    db.Tasks.RemoveRange(tasks);
    db.Boards.Remove(board);
    await db.SaveChangesAsync();

    return Results.Ok();
});

// ========== API ЗАДАЧ ==========

// Получить все задачи (опционально по доске)
app.MapGet("/api/tasks", async (AppDbContext db, Guid? boardId) =>
{
    if (boardId.HasValue)
        return Results.Ok(await db.Tasks.Where(t => t.BoardId == boardId).ToListAsync());
    return Results.Ok(await db.Tasks.ToListAsync());
});

// Получить задачи конкретной доски
app.MapGet("/api/boards/{boardId}/tasks", async (Guid boardId, AppDbContext db) =>
{
    var tasks = await db.Tasks.Where(t => t.BoardId == boardId).ToListAsync();
    return Results.Ok(tasks);
});

app.MapGet("/api/tasks/{id}", async (Guid id, AppDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    return task is not null ? Results.Ok(task) : Results.NotFound();
});

app.MapPost("/api/tasks", async (TaskItem task, AppDbContext db, IHubContext<TasksHub> hub) =>
{
    Console.WriteLine($"📥 Получена задача: {task.Title}, Статус: {task.Status}");

    task.Id = Guid.NewGuid();
    task.CreatedAt = DateTime.UtcNow;
    task.Tags ??= new List<string>();

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    Console.WriteLine($"✅ Задача сохранена с ID: {task.Id}");

    await hub.Clients.All.SendAsync("TaskCreated", task);
    return Results.Ok(task);
});

app.MapPut("/api/tasks/{id}", async (Guid id, TaskItem update, AppDbContext db, IHubContext<TasksHub> hub) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    task.Title = update.Title;
    task.Description = update.Description;
    task.Status = update.Status;
    task.Priority = update.Priority;
    task.Tags = update.Tags ?? new List<string>();
    task.BoardId = update.BoardId;

    if (update.DueDate.HasValue)
    {
        task.DueDate = update.DueDate.Value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(update.DueDate.Value, DateTimeKind.Utc)
            : update.DueDate.Value.ToUniversalTime();
    }
    else
    {
        task.DueDate = null;
    }

    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("TaskUpdated", task);
    return Results.Ok(task);
});

app.MapDelete("/api/tasks/{id}", async (Guid id, AppDbContext db, IHubContext<TasksHub> hub) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    db.Tasks.Remove(task);
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("TaskDeleted", id);
    return Results.Ok();
});

// Создание таблиц при запуске
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    Console.WriteLine("✅ База данных PostgreSQL подключена!");
}

app.Run();