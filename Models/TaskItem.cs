namespace Collabo.Models;

public class TaskItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "todo"; // todo, progress, done, overdue
    public string Priority { get; set; } = "medium"; // low, medium, high, urgent
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public Guid? AssigneeId { get; set; }
    public uint RowVersion { get; set; } // Для консистентности
    public bool IsOverdue => DueDate.HasValue && DueDate < DateTime.UtcNow && Status != "done";
}