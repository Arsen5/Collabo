using Collabo.Models;
using System.Threading.Channels;

namespace Collabo.Services;

public class EventQueue : IEventQueue
{
    private readonly Channel<TaskEvent> _channel = Channel.CreateUnbounded<TaskEvent>();

    public async Task PublishAsync(TaskEvent eventMessage)
    {
        await _channel.Writer.WriteAsync(eventMessage);
    }

    public IAsyncEnumerable<TaskEvent> ConsumeAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}