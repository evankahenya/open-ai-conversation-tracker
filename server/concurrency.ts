/**
 * Concurrency coordinator for OpenAI conversation operations.
 * Ensures that screenshot watcher analyses and user prompt messages
 * do not execute concurrently on the same OpenAI conversation.
 */

type Task = () => Promise<any>;

class ConversationQueue {
  private queue: Promise<any> = Promise.resolve();
  private isBusy = false;

  public async run<T>(task: () => Promise<T>): Promise<T> {
    const runTask = async (): Promise<T> => {
      this.isBusy = true;
      try {
        return await task();
      } finally {
        this.isBusy = false;
      }
    };

    // Chain the task onto the current promise
    const resultPromise = this.queue.then(runTask, runTask);
    // Keep the queue reference alive (swallow errors on the chain so subsequent tasks run)
    this.queue = resultPromise.catch(() => {});
    return resultPromise;
  }

  public get busy(): boolean {
    return this.isBusy;
  }
}

const queues = new Map<string, ConversationQueue>();

export function getConversationLock(conversationId: string): ConversationQueue {
  let q = queues.get(conversationId);
  if (!q) {
    q = new ConversationQueue();
    queues.set(conversationId, q);
  }
  return q;
}

export async function runInConversationLock<T>(
  conversationId: string,
  task: () => Promise<T>
): Promise<T> {
  const q = getConversationLock(conversationId);
  return q.run(task);
}
