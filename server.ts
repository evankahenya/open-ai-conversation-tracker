import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getConversation, getEvents, appendEvent, updateConversation, replaceEvents } from './server/store';
import { realtimeHub } from './server/realtime';
import { runInConversationLock } from './server/concurrency';
import {
  streamConversationResponse,
  fetchEarlierConversationFromOpenAI,
  createRealOpenAIConversation,
} from './server/openaiService';
import { startWatcher, triggerSampleCapture, getWatcherStatus } from './server/watcher';
import { AssistantMessageEvent, UserMessageEvent, ConversationEvent } from './server/types';

const PORT = 3000;
const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'data/screenshots');

async function startServer() {
  const app = express();

  // Basic request-size limits and parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --- API Endpoints ---

  // 1. Get conversation information
  app.get('/api/conversation', (req, res) => {
    try {
      const conv = getConversation();
      res.json({
        conversationId: conv.conversationId,
        status: conv.status,
        sessionStarted: conv.createdAt,
        screenshotCount: conv.screenshotCount,
        lastUpdate: conv.lastUpdate,
        currentActivity: conv.currentActivity,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve conversation information' });
    }
  });

  // 2. Get conversation history (with optional ?since=<eventId> parameter)
  app.get('/api/conversation/messages', (req, res) => {
    try {
      const sinceId = req.query.since as string | undefined;
      const sinceTime = req.query.sinceTime as string | undefined;
      const events = getEvents(sinceId, sinceTime);
      res.json({
        conversationId: getConversation().conversationId,
        events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve conversation events' });
    }
  });

  // Fetch earlier conversation history directly from OpenAI using the SDK
  app.post('/api/conversation/sync', async (req, res) => {
    try {
      const conv = getConversation();
      const targetId = req.body?.conversationId || conv.conversationId;

      console.log(`[Sync] Fetching earlier conversations from OpenAI for ${targetId}...`);
      const syncedItems = await fetchEarlierConversationFromOpenAI(targetId);

      // Map to ConversationEvent
      const newEvents: ConversationEvent[] = syncedItems.map((item) => {
        if (item.type === 'user_message') {
          return {
            id: item.id,
            type: 'user_message',
            conversationId: targetId,
            timestamp: item.timestamp,
            content: item.content,
          } as UserMessageEvent;
        } else {
          return {
            id: item.id,
            type: 'assistant_message',
            conversationId: targetId,
            timestamp: item.timestamp,
            content: item.content,
          } as AssistantMessageEvent;
        }
      });

      replaceEvents(newEvents);
      updateConversation({ conversationId: targetId, lastUpdate: new Date().toISOString() });

      // Notify all connected UI clients that history was synced
      realtimeHub.broadcast({
        id: `evt_sync_${Date.now()}`,
        type: 'conversation_synced',
        conversationId: targetId,
        timestamp: new Date().toISOString(),
        data: { count: newEvents.length },
      });

      res.json({
        success: true,
        conversationId: targetId,
        count: newEvents.length,
        events: newEvents,
      });
    } catch (err: any) {
      console.error('[Sync Error]:', err.message);
      res.status(500).json({ error: err.message || 'Failed to sync earlier conversation from OpenAI' });
    }
  });

  // Switch or set conversation ID
  app.post('/api/conversation/set-id', async (req, res) => {
    try {
      const { conversationId } = req.body;
      if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
        res.status(400).json({ error: 'Valid conversationId is required' });
        return;
      }
      const trimmedId = conversationId.trim();
      updateConversation({ conversationId: trimmedId, lastUpdate: new Date().toISOString() });

      res.json({ success: true, conversationId: trimmedId });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update conversation ID' });
    }
  });

  // Create a brand new real OpenAI conversation via SDK
  app.post('/api/conversation/create', async (req, res) => {
    try {
      const newId = await createRealOpenAIConversation();
      updateConversation({
        conversationId: newId,
        screenshotCount: 0,
        currentActivity: undefined,
        lastUpdate: new Date().toISOString(),
      });
      replaceEvents([]);

      realtimeHub.broadcast({
        id: `evt_newconv_${Date.now()}`,
        type: 'conversation_created',
        conversationId: newId,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, conversationId: newId });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create OpenAI conversation' });
    }
  });

  // Clear all events (no dummy data)
  app.post('/api/conversation/clear', (req, res) => {
    try {
      replaceEvents([]);
      updateConversation({ screenshotCount: 0, currentActivity: undefined });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to clear events' });
    }
  });

  // 3. Send user message with real-time streaming response
  app.post('/api/conversation/message', async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const trimmed = message.trim();
    const conv = getConversation();
    const conversationId = conv.conversationId;
    const timestamp = new Date().toISOString();

    const userEventId = `evt_usr_${Date.now()}`;
    const userEvent: UserMessageEvent = {
      id: userEventId,
      type: 'user_message',
      conversationId,
      timestamp,
      content: trimmed,
    };

    // Store user message and broadcast to all connected clients
    appendEvent(userEvent);
    realtimeHub.broadcast(userEvent);

    const messageId = `msg_asst_${Date.now()}`;
    const assistantEventId = `evt_asst_${Date.now()}`;

    // Set up SSE stream for HTTP response to the sender
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    // Acquire conversation lock so requests to the persistent conversation don't conflict
    try {
      await runInConversationLock(conversationId, async () => {
        let accumulatedText = '';

        await streamConversationResponse(conversationId, trimmed, {
          onStart: () => {
            // Send initial delta
            const startPayload = { messageId, delta: '' };
            res.write(`event: assistant_delta\ndata: ${JSON.stringify(startPayload)}\n\n`);
          },
          onDelta: (delta: string) => {
            accumulatedText += delta;
            const deltaPayload = {
              id: `evt_delta_${Date.now()}`,
              type: 'assistant_delta',
              conversationId,
              timestamp: new Date().toISOString(),
              data: {
                messageId,
                delta,
              },
            };

            // Stream to the POST response connection
            res.write(`event: assistant_delta\ndata: ${JSON.stringify(deltaPayload.data)}\n\n`);

            // Also broadcast to other active browser tabs/monitors
            realtimeHub.broadcast(deltaPayload);
          },
          onComplete: (fullText: string) => {
            accumulatedText = fullText;
          },
          onError: (err: Error) => {
            console.error('[Message Streaming Error]:', err.message);
            res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
          },
        });

        // Persist final assistant response to event store
        const assistantEvent: AssistantMessageEvent = {
          id: assistantEventId,
          type: 'assistant_message',
          conversationId,
          timestamp: new Date().toISOString(),
          content: accumulatedText || 'Analysis complete.',
          inReplyTo: userEventId,
        };
        appendEvent(assistantEvent);

        // Send final event to client and close POST stream
        res.write(`event: assistant_message\ndata: ${JSON.stringify(assistantEvent)}\n\n`);
        res.end();

        // Broadcast to other sessions
        realtimeHub.broadcast(assistantEvent);
      });
    } catch (err: any) {
      console.error('[Error handling user message]:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process message' });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Internal processing error' })}\n\n`);
        res.end();
      }
    }
  });

  // 4. Real-time Server-Sent Events stream for background watcher events & synchronization
  app.get('/api/events', (req, res) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lastEventId = (req.headers['last-event-id'] as string) || (req.query.since as string);
    realtimeHub.addClient(clientId, res, lastEventId);
  });

  // 5. Screenshot serving with safe path validation
  app.get('/api/screenshots/:filename', (req, res) => {
    const filename = req.params.filename;

    // Strict validation against path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const safePath = path.join(SCREENSHOTS_DIR, filename);

    // Verify it resolves strictly inside designated screenshots directory
    if (!safePath.startsWith(SCREENSHOTS_DIR)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!fs.existsSync(safePath)) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(safePath).pipe(res);
  });

  // 6. Trigger screenshot analysis (for demonstration / testing)
  app.post('/api/watcher/trigger', async (req, res) => {
    try {
      await triggerSampleCapture();
      res.json({ success: true, message: 'Screenshot captured and queued for analysis' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger screenshot capture' });
    }
  });

  // 7. Watcher status endpoint
  app.get('/api/watcher/status', (req, res) => {
    res.json(getWatcherStatus());
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Start background screenshot watcher process
  startWatcher();

  // Vite middleware setup (development vs production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Screen Monitor Server] listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
