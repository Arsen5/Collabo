using MassTransit;
using Collabo.Events;  // <-- Подключаем пространство имен с событием

namespace Collabo.Consumers
{
    public class TaskDeletedConsumer : IConsumer<TaskDeletedEvent>
    {
        public async Task Consume(ConsumeContext<TaskDeletedEvent> context)
        {
            // Эта штука теперь получит сообщение из RabbitMQ!
            Console.WriteLine($"[RabbitMQ] Задача {context.Message.TaskId} удалена");
            // Здесь будет твоя логика
        }
    }
}