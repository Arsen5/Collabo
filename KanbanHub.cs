using Microsoft.AspNetCore.SignalR;

namespace TaskFlow
{
    // Это "проводник" для твоих real-time сообщений
    public class KanbanHub : Hub
    {
        // Метод, который будет вызываться, когда задача перемещена
        public async Task SendTaskMoved(string taskId, string newStatus)
        {
            // Передаем это событие всем, кто сейчас онлайн на сайте
            await Clients.All.SendAsync("ReceiveTaskUpdate", taskId, newStatus);
        }
    }
}