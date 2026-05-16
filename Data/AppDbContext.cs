using Microsoft.EntityFrameworkCore;
using Collabo.Models;

namespace Collabo.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TaskItem> Tasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TaskItem>().ToTable("tasks");
        modelBuilder.Entity<TaskItem>().HasKey(t => t.Id);

        // Настройка для хранения тегов (список -> строка)
        modelBuilder.Entity<TaskItem>().Property(t => t.Tags)
            .HasConversion(
                v => string.Join(',', v),
                v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
            );
    }
}