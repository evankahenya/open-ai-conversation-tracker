import fs from 'fs';
import path from 'path';
import { ConversationData, ConversationEvent } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONV_FILE = path.join(DATA_DIR, 'conversation.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let cachedConversation: ConversationData | null = null;
let cachedEvents: ConversationEvent[] | null = null;

function loadConversation(): ConversationData {
  if (cachedConversation) return cachedConversation;
  try {
    if (fs.existsSync(CONV_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONV_FILE, 'utf-8'));
      if (data.conversationId) {
        cachedConversation = data;
        return cachedConversation!;
      }
    }
  } catch (err) {
    console.error('Failed to read conversation.json, creating fallback:', err);
  }

  const initial: ConversationData = {
    conversationId: 'conv_abc123',
    createdAt: new Date().toISOString(),
    status: 'monitoring',
    screenshotCount: 0,
    lastUpdate: new Date().toISOString(),
    currentActivity: undefined,
  };
  saveConversation(initial);
  return initial;
}

function saveConversation(data: ConversationData): void {
  cachedConversation = data;
  try {
    fs.writeFileSync(CONV_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write conversation.json:', err);
  }
}

function loadEvents(): ConversationEvent[] {
  if (cachedEvents) return cachedEvents;
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        cachedEvents = data;
        return cachedEvents;
      }
    }
  } catch (err) {
    console.error('Failed to read events.json:', err);
  }

  cachedEvents = [];
  saveEvents(cachedEvents);
  return cachedEvents;
}

function saveEvents(events: ConversationEvent[]): void {
  cachedEvents = events;
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write events.json:', err);
  }
}

export function getConversation(): ConversationData {
  return loadConversation();
}

export function updateConversation(partial: Partial<ConversationData>): ConversationData {
  const current = loadConversation();
  const updated = {
    ...current,
    ...partial,
    lastUpdate: partial.lastUpdate || new Date().toISOString(),
  };
  saveConversation(updated);
  return updated;
}

export function getEvents(sinceId?: string, sinceTime?: string): ConversationEvent[] {
  const all = loadEvents();
  if (sinceId) {
    const idx = all.findIndex((e) => e.id === sinceId);
    if (idx !== -1) {
      return all.slice(idx + 1);
    }
  }
  if (sinceTime) {
    const sinceDate = new Date(sinceTime).getTime();
    return all.filter((e) => new Date(e.timestamp).getTime() > sinceDate);
  }
  return all;
}

export function appendEvent(event: ConversationEvent): ConversationEvent {
  const events = loadEvents();
  events.push(event);
  saveEvents(events);
  updateConversation({ lastUpdate: event.timestamp });
  return event;
}

export function updateEventContent(id: string, newContent: string): void {
  const events = loadEvents();
  const target = events.find((e) => e.id === id);
  if (target && 'content' in target) {
    target.content = newContent;
    saveEvents(events);
  }
}

export function incrementScreenshotCount(): number {
  const current = loadConversation();
  const count = (current.screenshotCount || 0) + 1;
  updateConversation({ screenshotCount: count, lastUpdate: new Date().toISOString() });
  return count;
}

export function setCurrentActivity(activity: {
  application: string;
  activity: string;
  lastUpdate: string;
}): void {
  updateConversation({
    currentActivity: activity,
    lastUpdate: activity.lastUpdate,
  });
}

export function replaceEvents(newEvents: ConversationEvent[]): void {
  saveEvents(newEvents);
  if (newEvents.length > 0) {
    updateConversation({ lastUpdate: newEvents[newEvents.length - 1].timestamp });
  }
}
