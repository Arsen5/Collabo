using Microsoft.AspNetCore.SignalR;

namespace Collabo.Hubs;

public class TasksHub : Hub
{
    public async Task JoinBoard(string boardId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, boardId);

    public async Task LeaveBoard(string boardId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
}