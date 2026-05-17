using System.ComponentModel.DataAnnotations;

namespace Collabo.Models;

public class BoardMember
{
    [Key]
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public string UserId { get; set; } = "";
    public string Role { get; set; } = "Member"; // Admin, Member
    public DateTime JoinedAt { get; set; }
}