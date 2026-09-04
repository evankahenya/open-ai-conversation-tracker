import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

let openAIClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: apiKey.trim() });
  }
  return openAIClient;
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

export interface StreamCallbacks {
  onStart?: (meta: { messageId: string }) => void;
  onDelta: (delta: string) => void;
  onComplete: (fullText: string) => void;
  onError: (err: Error) => void;
}

export interface SyncedConversationItem {
  id: string;
  type: 'user_message' | 'assistant_message';
  conversationId: string;
  timestamp: string;
  content: string;
}

/**
 * Creates a genuine persistent conversation on OpenAI's platform via the SDK.
 */
export async function createRealOpenAIConversation(): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OPENAI_API_KEY is not configured. Add your key to .env to create a real OpenAI conversation.');
  }
  const conv = await client.conversations.create();
  return conv.id;
}

/**
 * Retrieves an existing conversation from OpenAI via the SDK.
 */
export async function retrieveOpenAIConversation(conversationId: string) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OPENAI_API_KEY is not configured in .env.');
  }
  return await client.conversations.retrieve(conversationId);
}

/**
 * Fetches earlier conversation history directly from OpenAI's servers using the Conversations API.
 * This reads genuine user and assistant turns stored under the persistent conversation ID.
 */
export async function fetchEarlierConversationFromOpenAI(
  conversationId: string
): Promise<SyncedConversationItem[]> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Set your OpenAI API key in .env to stream and fetch genuine earlier conversations without dummy data.'
    );
  }

  try {
    const itemsPage = await client.conversations.items.list(conversationId);
    const items: SyncedConversationItem[] = [];

    for await (const rawItem of itemsPage) {
      const item = rawItem as any;
      const role = item.role || (item.type === 'message' ? item.role : undefined);

      let contentText = '';
      if (typeof item.content === 'string') {
        contentText = item.content;
      } else if (Array.isArray(item.content)) {
        contentText = item.content
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (part?.text) return part.text;
            if (part?.input_text) return part.input_text;
            if (part?.output_text) return part.output_text;
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }

      if (!contentText && !role) {
        continue;
      }

      const timestamp = item.created_at
        ? typeof item.created_at === 'number'
          ? new Date(item.created_at * 1000).toISOString()
          : new Date(item.created_at).toISOString()
        : new Date().toISOString();

      if (role === 'user') {
        items.push({
          id: item.id || `evt_usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'user_message',
          conversationId,
          timestamp,
          content: contentText || '(User message)',
        });
      } else if (role === 'assistant') {
        items.push({
          id: item.id || `evt_asst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'assistant_message',
          conversationId,
          timestamp,
          content: contentText || '(Assistant response)',
        });
      }
    }

    // Sort chronologically (oldest first)
    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return items;
  } catch (err: any) {
    console.error('[OpenAI Sync Error]:', err?.message || err);
    throw new Error(`Failed to fetch earlier conversation from OpenAI: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Streams a user query to the OpenAI persistent conversation using the Responses API.
 * Uses persistent conversation context on OpenAI's servers with zero dummy data.
 */
export async function streamConversationResponse(
  conversationId: string,
  userMessage: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const client = getOpenAIClient();
  const model = getModelName();

  if (!client) {
    const errorMsg =
      'OPENAI_API_KEY is not configured in .env. Please set your genuine OpenAI API key to stream live ChatGPT responses without dummy data.';
    callbacks.onError(new Error(errorMsg));
    return;
  }

  try {
    const stream = await client.responses.create({
      model,
      conversation: conversationId,
      input: userMessage,
      stream: true,
    });

    let fullText = '';

    for await (const event of stream) {
      let delta = '';
      const ev = event as any;

      if (ev.type === 'response.output_text.delta' && ev.delta) {
        delta = typeof ev.delta === 'string' ? ev.delta : ev.delta.text || '';
      } else if (ev.type === 'response.text.delta' && ev.delta) {
        delta = typeof ev.delta === 'string' ? ev.delta : ev.delta.text || '';
      } else if (ev.delta?.text) {
        delta = ev.delta.text;
      } else if (typeof ev.delta === 'string') {
        delta = ev.delta;
      }

      if (delta) {
        fullText += delta;
        callbacks.onDelta(delta);
      }
    }

    callbacks.onComplete(fullText);
  } catch (err: any) {
    console.error('[OpenAI Stream Error]:', err?.message || err);
    callbacks.onError(new Error(`OpenAI API error: ${err?.message || 'Failed to stream response'}`));
  }
}

/**
 * Feeds a newly captured screenshot into the persistent OpenAI conversation
 * using the Responses API with multimodal input.
 */
export async function analyzeScreenshotWithOpenAI(
  conversationId: string,
  screenshotPath: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const client = getOpenAIClient();
  const model = getModelName();

  if (!client) {
    const errorMsg =
      'OPENAI_API_KEY is not configured in .env. Please set your genuine OpenAI API key to analyze screenshots without dummy data.';
    callbacks.onError(new Error(errorMsg));
    return;
  }

  try {
    let base64Image = '';
    const ext = path.extname(screenshotPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    if (fs.existsSync(screenshotPath)) {
      const buffer = fs.readFileSync(screenshotPath);
      base64Image = `data:${mime};base64,${buffer.toString('base64')}`;
    }

    const promptInstruction =
      'You are a real-time screen monitoring AI. Analyze this desktop screenshot. ' +
      'Briefly describe what application is currently active, what the user is working on, ' +
      'and any notable actions, code, or context visible. Keep the response concise, structured, and informative.';

    const inputPayload: any = [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: promptInstruction },
          ...(base64Image ? [{ type: 'input_image', image_url: base64Image }] : []),
        ],
      },
    ];

    const stream = await client.responses.create({
      model,
      conversation: conversationId,
      input: inputPayload,
      stream: true,
    });

    let fullText = '';

    for await (const event of stream) {
      let delta = '';
      const ev = event as any;

      if (ev.type === 'response.output_text.delta' && ev.delta) {
        delta = typeof ev.delta === 'string' ? ev.delta : ev.delta.text || '';
      } else if (ev.type === 'response.text.delta' && ev.delta) {
        delta = typeof ev.delta === 'string' ? ev.delta : ev.delta.text || '';
      } else if (ev.delta?.text) {
        delta = ev.delta.text;
      } else if (typeof ev.delta === 'string') {
        delta = ev.delta;
      }

      if (delta) {
        fullText += delta;
        callbacks.onDelta(delta);
      }
    }

    callbacks.onComplete(fullText);
  } catch (err: any) {
    console.error('[OpenAI Screenshot Analysis Error]:', err?.message || err);
    callbacks.onError(new Error(`Screenshot analysis error: ${err?.message || 'Failed to process screenshot'}`));
  }
}
