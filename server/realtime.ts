import { Response } from 'express';
import { ConversationEvent } from './types';
import { getEvents } from './store';

interface SseClient {
  id: string;
  res: Response;
  lastEventId?: string;
}

class RealtimeHub {
  private clients = new Map<string, SseClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((client) => {
        try {
          client.res.write(': heartbeat\n\n');
        } catch {
          this.removeClient(client.id);
        }
      });
    }, 15000);
  }

  public addClient(id: string, res: Response, lastEventId?: string): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const client: SseClient = { id, res, lastEventId };
    this.clients.set(id, client);

    // Send connection handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    // If client provided a lastEventId, replay missed events!
    if (lastEventId) {
      const missedEvents = getEvents(lastEventId);
      for (const event of missedEvents) {
        this.sendEventToClient(client, event);
      }
    }

    res.on('close', () => {
      this.removeClient(id);
    });
  }

  public removeClient(id: string): void {
    this.clients.delete(id);
  }

  public get clientCount(): number {
    return this.clients.size;
  }

  private sendEventToClient(client: SseClient, event: ConversationEvent | any): void {
    try {
      const eventType = event.type || 'message';
      const eventId = event.id || `evt_${Date.now()}`;
      client.res.write(`id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`);
    } catch {
      this.removeClient(client.id);
    }
  }

  public broadcast(event: ConversationEvent | any): void {
    this.clients.forEach((client) => {
      this.sendEventToClient(client, event);
    });
  }
}

export const realtimeHub = new RealtimeHub();
