using Microsoft.AspNetCore.SignalR;

namespace Collabo.Hubs;

public class TasksHub : Hub
{
    // Методы для работы с доской
    public async Task JoinBoard(string boardId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, boardId);

    public async Task LeaveBoard(string boardId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);

    // Метод для перемещения задачи
    public async Task SendTaskMoved(string taskId, string newStatus)
    {
        await Clients.All.SendAsync("ReceiveTaskUpdate", taskId, newStatus);
    }

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
}