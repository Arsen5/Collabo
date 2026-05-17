using System.ComponentModel.DataAnnotations;

namespace Collabo.Models;

public class Board
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? OwnerId { get; set; }
}