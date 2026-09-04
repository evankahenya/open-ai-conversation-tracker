export interface CurrentActivity {
  application: string;
  activity: string;
  lastUpdate: string;
}

export interface ConversationInfo {
  conversationId: string;
  status: 'monitoring' | 'paused' | 'idle';
  sessionStarted: string;
  screenshotCount: number;
  lastUpdate: string;
  currentActivity?: CurrentActivity;
}

export type EventType =
  | 'screenshot_analysis'
  | 'user_message'
  | 'assistant_message'
  | 'screenshot'
  | 'assistant_delta'
  | 'activity_update'
  | 'watcher_status'
  | 'error';

export interface BaseEvent {
  id: string;
  type: EventType;
  conversationId: string;
  timestamp: string;
}

export interface ScreenshotAnalysisEvent extends BaseEvent {
  type: 'screenshot_analysis';
  screenshot: string;
  screenshotUrl: string;
  content: string;
  activity?: CurrentActivity;
}

export interface UserMessageEvent extends BaseEvent {
  type: 'user_message';
  content: string;
}

export interface AssistantMessageEvent extends BaseEvent {
  type: 'assistant_message';
  content: string;
  inReplyTo?: string;
  isStreaming?: boolean;
}

export interface ScreenshotEvent extends BaseEvent {
  type: 'screenshot';
  data: {
    filename: string;
    url: string;
  };
}

export interface AssistantDeltaEvent extends BaseEvent {
  type: 'assistant_delta';
  data: {
    messageId: string;
    delta: string;
  };
}

export interface ActivityUpdateEvent extends BaseEvent {
  type: 'activity_update';
  data: CurrentActivity;
}

export type ConversationMessage =
  | ScreenshotAnalysisEvent
  | UserMessageEvent
  | AssistantMessageEvent;

export type ConnectionStatusType = 'connected' | 'reconnecting' | 'disconnected';
