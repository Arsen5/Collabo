using Collabo.Data;
using Collabo.Hubs;
using Collabo.Models;
using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = "Host=localhost; Database=taskflow; Username=postgres; Password=postgres";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ========== IDENTITY ==========
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ========== JWT ==========
var jwtKey = "CollaboSuperSecretKey2024ForJWTTokenHackathon!";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ========== RABBITMQ ==========
builder.Services.AddMassTransit(x =>
{
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

builder.WebHost.UseUrls("http://0.0.0.0:5000");

var app = builder.Build();

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
app.UseAuthentication();
app.UseAuthorization();
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
app.MapGet("/api/boards", async (AppDbContext db, HttpContext httpContext) =>
{
    var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Results.Unauthorized();
    var boards = await db.Boards.Where(b => b.OwnerId == userId).ToListAsync();
    return Results.Ok(boards);
}).RequireAuthorization();

app.MapPost("/api/boards", async (Board board, AppDbContext db, HttpContext httpContext) =>
{
    var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Results.Unauthorized();
    board.Id = Guid.NewGuid();
    board.CreatedAt = DateTime.UtcNow;
    board.OwnerId = userId;
    db.Boards.Add(board);
    await db.SaveChangesAsync();
    return Results.Ok(board);
}).RequireAuthorization();

app.MapDelete("/api/boards/{id}", async (Guid id, AppDbContext db, HttpContext httpContext) =>
{
    var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Results.Unauthorized();
    var board = await db.Boards.FindAsync(id);
    if (board is null) return Results.NotFound();
    if (board.OwnerId != userId) return Results.Forbid();
    var tasks = db.Tasks.Where(t => t.BoardId == id);
    db.Tasks.RemoveRange(tasks);
    db.Boards.Remove(board);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

// ========== API ЗАДАЧ ==========
app.MapGet("/api/tasks", async (AppDbContext db, Guid? boardId) =>
{
    if (boardId.HasValue)
        return Results.Ok(await db.Tasks.Where(t => t.BoardId == boardId).ToListAsync());
    return Results.Ok(await db.Tasks.ToListAsync());
});

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
    task.Id = Guid.NewGuid();
    task.CreatedAt = DateTime.UtcNow;
    task.Tags ??= new List<string>();
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
    task.BoardId = update.BoardId;
    task.Assignee = update.Assignee;
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

app.MapDelete("/api/tasks/{id}", async (Guid id, AppDbContext db, IHubContext<TasksHub> hub, IPublishEndpoint publishEndpoint) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();
    db.Tasks.Remove(task);
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("TaskDeleted", id);

    // Отправка в RabbitMQ
    await publishEndpoint.Publish(new TaskDeletedEvent { TaskId = id, TaskTitle = task.Title });

    return Results.Ok();
});

// ========== API АВТОРИЗАЦИИ ==========
app.MapPost("/api/auth/register", async (RegisterRequest request, UserManager<ApplicationUser> userManager) =>
{
    var user = new ApplicationUser
    {
        UserName = request.Email,
        Email = request.Email,
        FullName = request.FullName
    };
    var result = await userManager.CreateAsync(user, request.Password);
    if (!result.Succeeded)
        return Results.BadRequest(result.Errors.First().Description);
    return Results.Ok(new { message = "Регистрация успешна" });
});

app.MapPost("/api/auth/login", async (LoginRequest request, UserManager<ApplicationUser> userManager) =>
{
    var user = await userManager.FindByEmailAsync(request.Email);
    if (user == null || !await userManager.CheckPasswordAsync(user, request.Password))
        return Results.Unauthorized();
    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName)
        }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    var tokenString = tokenHandler.WriteToken(token);
    return Results.Ok(new { token = tokenString, userId = user.Id, userName = user.FullName });
});

// ========== ПРИГЛАШЕНИЯ (ОБЩИЕ ДОСКИ) ==========

app.MapGet("/api/user/boards", async (AppDbContext db, HttpContext httpContext) =>
{
    var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Results.Unauthorized();

    var ownBoards = await db.Boards.Where(b => b.OwnerId == userId).ToListAsync();
    var sharedBoards = await db.BoardMembers
        .Where(m => m.UserId == userId)
        .Join(db.Boards, m => m.BoardId, b => b.Id, (m, b) => b)
        .ToListAsync();

    var allBoards = ownBoards.Concat(sharedBoards).Distinct().ToList();
    return Results.Ok(allBoards);
}).RequireAuthorization();

app.MapPost("/api/boards/{boardId}/invite", async (Guid boardId, InviteRequest request, AppDbContext db, HttpContext httpContext) =>
{
    var currentUserId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (currentUserId == null) return Results.Unauthorized();

    var board = await db.Boards.FindAsync(boardId);
    if (board == null) return Results.NotFound();
    if (board.OwnerId != currentUserId) return Results.Forbid();

    var invitedUser = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
    if (invitedUser == null) return Results.BadRequest("Пользователь с таким email не найден");

    var existing = await db.BoardMembers.FirstOrDefaultAsync(m => m.BoardId == boardId && m.UserId == invitedUser.Id);
    if (existing != null) return Results.BadRequest("Пользователь уже имеет доступ");

    var boardMember = new BoardMember
    {
        Id = Guid.NewGuid(),
        BoardId = boardId,
        UserId = invitedUser.Id,
        Role = "Member",
        JoinedAt = DateTime.UtcNow
    };
    db.BoardMembers.Add(boardMember);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Пользователь приглашён" });
}).RequireAuthorization();

// ========== СОЗДАНИЕ ТАБЛИЦ ==========
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    Console.WriteLine("✅ База данных PostgreSQL подключена!");
}

app.Run();

// ========== МОДЕЛИ ==========
public class RegisterRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string FullName { get; set; } = "";
}

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class InviteRequest
{
    public string Email { get; set; } = "";
}

public class TaskDeletedEvent
{
    public Guid TaskId { get; set; }
    public string TaskTitle { get; set; } = "";
}