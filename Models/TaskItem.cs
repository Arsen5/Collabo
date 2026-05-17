namespace Collabo.Models;

public class TaskItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "todo"; // todo, progress, done
    public string Priority { get; set; } = "medium";
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public string? AssigneeId { get; set; }
    public uint RowVersion { get; set; }
    public Guid? BoardId { get; set; }  // ← ДОБАВИТЬ ЭТУ СТРОКУ
}