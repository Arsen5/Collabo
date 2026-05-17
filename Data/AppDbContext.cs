using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Collabo.Models;

namespace Collabo.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TaskItem> Tasks { get; set; }
    public DbSet<Board> Boards { get; set; }  // ← ДОБАВИТЬ

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TaskItem>().ToTable("tasks");
        modelBuilder.Entity<TaskItem>().HasKey(t => t.Id);

        // Настройка для тегов
        modelBuilder.Entity<TaskItem>().Property(t => t.Tags)
            .HasConversion(
                v => string.Join(',', v),
                v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
            );



        // Настройка для Board
        modelBuilder.Entity<Board>().ToTable("boards");
        modelBuilder.Entity<Board>().HasKey(b => b.Id);
    }
}