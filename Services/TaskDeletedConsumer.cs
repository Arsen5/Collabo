using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Collabo.Hubs;

namespace Collabo.Services; // Указываем, что файл лежит в папке Services

public class TaskDeletedConsumer : IConsumer<TaskDeleted>
{
    private readonly IHubContext<TasksHub> _hubContext;

    public TaskDeletedConsumer(IHubContext<TasksHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task Consume(ConsumeContext<TaskDeleted> context)
    {
        // Когда RabbitMQ говорит, что задача удалена, SignalR передает это в браузер
        await _hubContext.Clients.All.SendAsync("TaskDeleted", context.Message.Id);
    }
}