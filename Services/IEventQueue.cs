using Collabo.Models;

namespace Collabo.Services;

public interface IEventQueue
{
    Task PublishAsync(TaskEvent eventMessage);
    IAsyncEnumerable<TaskEvent> ConsumeAsync(CancellationToken cancellationToken);
}