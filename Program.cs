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

// ========== API (БЕЗ АВТОРИЗАЦИИ) ==========
app.MapGet("/api/tasks", async (AppDbContext db) =>
{
    var tasks = await db.Tasks.ToListAsync();
    return Results.Ok(tasks);
});

app.MapGet("/api/tasks/{id}", async (Guid id, AppDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    return task is not null ? Results.Ok(task) : Results.NotFound();
});

app.MapPost("/api/tasks", async (TaskItem task, AppDbContext db, IHubContext<TasksHub> hub) =>
{
    task.Id = Guid.NewGuid();
    task.CreatedAt = DateTime.UtcNow;
    task.Tags ??= new List<string>();

    if (task.DueDate.HasValue && task.DueDate.Value.Kind != DateTimeKind.Utc)
    {
        task.DueDate = task.DueDate.Value.ToUniversalTime();
    }

    db.Tasks.Add(task);
    await db.SaveChangesAsync();
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