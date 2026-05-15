namespace Collabo.Models;

public class TaskEvent
{
    public Guid Id { get; set; }
    public string Type { get; set; } = ""; // Created, Updated, Moved, Deleted
    public Guid TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public DateTime OccurredAt { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}